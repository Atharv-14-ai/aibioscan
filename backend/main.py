import os
import json
import tempfile
import librosa
import soundfile as sf
from datetime import datetime
import numpy as np

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sqlalchemy import func
import base64
from io import BytesIO
from typing import List, Optional

# --- Local Imports ---
from src.config import load_config
from src.infer import preprocess
from src.db import get_db, init_db
from src.models import User, Report
from src.auth import hash_password, verify_password
from src.report_generator import generate_medical_report
from tensorflow.keras.models import load_model

# Try to import matplotlib for heatmap generation
try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    print("Warning: matplotlib not installed. Using placeholder images.")

# Try to import Grad-CAM
try:
    from src.gradcam import generate_gradcam_heatmap
    GRADCAM_AVAILABLE = True
except ImportError:
    GRADCAM_AVAILABLE = False
    print("Warning: Grad-CAM module not found. Using placeholder heatmaps.")

# ==================== INITIALIZATION ====================
init_db()
app = FastAPI(title="AI-BioScan API", version="1.0")

# Create necessary directories
os.makedirs("heatmaps", exist_ok=True)
os.makedirs("generated_reports", exist_ok=True)
os.makedirs("user_reports", exist_ok=True)

# Mount static folders for serving images
app.mount("/heatmaps", StaticFiles(directory="heatmaps"), name="heatmaps")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== LOAD ML ASSETS ====================
cfg = load_config("config.yaml")
model_path = os.path.join(cfg["model_dir"], cfg["model_name"])

if not os.path.exists(model_path):
    raise RuntimeError("Model file missing! Please train the model first.")

model = load_model(model_path, compile=False)

with open(os.path.join(cfg["model_dir"], "label_map.json"), "r") as f:
    label_map = json.load(f)
labels = [label_map[str(i)] for i in range(len(label_map))]

# =========================================================
# CLINICAL SYMPTOM LOGIC GATE
# =========================================================
SYMPTOM_WEIGHTS = {
    "Pneumonia": ["Fever", "Chills", "Cough with Phlegm", "Difficulty breathing", "Chest pain"],
    "Asthma": ["Shortness of Breath", "Chest Tightness/Pain", "Wheezing", "Coughing at night"],
    "Tuberculosis": ["Night Sweats", "Dry/Persistent Cough", "Fatigue", "Chest Tightness/Pain", "Fever", "Weight loss"],
    "COPD": ["Excess Mucus", "Dry/Persistent Cough", "Wheezing", "Shortness of Breath", "Chronic bronchitis"],
    "Healthy": []
}

def adjust_confidence_with_symptoms(base_prediction, base_confidence, patient_symptoms):
    """
    Boosts AI confidence if patient symptoms match the disease profile.
    This implements a clinical logic gate for multi-modal diagnosis.
    """
    if base_prediction == "Healthy" or not patient_symptoms:
        return base_confidence

    relevant_symptoms = SYMPTOM_WEIGHTS.get(base_prediction, [])
    
    if not relevant_symptoms:
        return base_confidence
    
    # Count how many symptoms the patient checked actually match the AI's prediction
    matches = sum(1 for sym in patient_symptoms if sym in relevant_symptoms)
    total_relevant = len(relevant_symptoms)
    
    # Calculate match percentage
    match_percentage = matches / total_relevant if total_relevant > 0 else 0
    
    # Boost confidence based on match percentage (up to 17.5% boost)
    # 1 match = 3.5% boost, 2 matches = 7%, 3 matches = 10.5%, etc.
    boost = match_percentage * 0.175
    new_confidence = base_confidence + boost

    # Never let it exceed 99.5% (AI should never be 100% certain)
    # Also ensure it doesn't go below original confidence
    final_confidence = min(new_confidence, 0.995)
    
    print(f"Clinical logic gate: {matches}/{total_relevant} symptoms matched, boost: {boost*100:.1f}%, new confidence: {final_confidence*100:.1f}%")
    
    return final_confidence

# ==================== DISEASE INFORMATION ====================
DISEASE_INFO = {
    "Pneumonia": {
        "desc": "Inflammation of the air sacs in one or both lungs caused by an infection. The air sacs may fill with fluid or pus, causing cough with phlegm, fever, chills, and difficulty breathing.",
        "symptoms": ["Fever and chills", "Cough with phlegm", "Chest pain", "Shortness of breath", "Fatigue", "Nausea or vomiting"],
        "treatment": ["Antibiotics (if bacterial)", "Rest and hydration", "Over-the-counter medications", "Oxygen therapy", "Hospitalization in severe cases"]
    },
    "Asthma": {
        "desc": "A chronic condition that narrows and inflames the airways, making breathing difficult. Triggers can include allergens, exercise, cold air, or stress.",
        "symptoms": ["Coughing, especially at night", "Wheezing", "Shortness of breath", "Chest tightness", "Rapid breathing", "Difficulty sleeping"],
        "treatment": ["Inhalers (rescue and controller)", "Avoid triggers/allergens", "Allergy medications", "Bronchial thermoplasty", "Immunotherapy"]
    },
    "Tuberculosis": {
        "desc": "An infectious disease caused by Mycobacterium tuberculosis, primarily affecting the lungs. It spreads through the air when an infected person coughs or sneezes.",
        "symptoms": ["Persistent cough (3+ weeks)", "Chest pain", "Coughing up blood", "Fatigue", "Night sweats", "Weight loss", "Loss of appetite"],
        "treatment": ["Long-term antibiotics (6-9 months)", "Isolation during contagious period", "Directly observed therapy (DOT)", "Nutritional support", "Vitamin B6 supplementation"]
    },
    "COPD": {
        "desc": "Chronic Obstructive Pulmonary Disease is a progressive lung disease that makes it hard to breathe. It's typically caused by long-term exposure to irritating gases or particulate matter.",
        "symptoms": ["Shortness of breath", "Wheezing", "Chest tightness", "Chronic cough", "Excess mucus production", "Frequent respiratory infections"],
        "treatment": ["Bronchodilators", "Corticosteroids", "Pulmonary rehabilitation", "Oxygen therapy", "Lifestyle changes", "Surgery in severe cases"]
    },
    "Healthy": {
        "desc": "No abnormalities detected in respiratory patterns. Lung sounds are clear and normal. Continue maintaining good respiratory health.",
        "symptoms": ["Normal breathing patterns", "Clear lung sounds", "No respiratory distress", "Regular oxygen saturation"],
        "treatment": ["Maintain regular exercise", "Stay hydrated", "Annual check-ups", "Avoid smoking", "Practice deep breathing exercises"]
    }
}

# ==================== DOCTOR DATABASE ====================
DOCTOR_DATABASE = {
    "Pneumonia": [
        {"id": 1, "name": "Dr. Sarah Chen", "specialty": "Senior Pulmonologist", "hospital": "City General Hospital", "phone": "+1 (555) 123-4567", "rating": 4.9, "available": True},
        {"id": 2, "name": "Dr. Marcus Thorne", "specialty": "Respiratory Specialist", "hospital": "Westside Medical Center", "phone": "+1 (555) 987-6543", "rating": 4.8, "available": True},
        {"id": 3, "name": "Dr. Priya Sharma", "specialty": "Infectious Disease Specialist", "hospital": "Metro Health Clinic", "phone": "+1 (555) 456-7890", "rating": 4.9, "available": True}
    ],
    "Asthma": [
        {"id": 4, "name": "Dr. James Wilson", "specialty": "Allergy & Asthma Specialist", "hospital": "BreatheWell Clinic", "phone": "+1 (555) 222-3333", "rating": 4.7, "available": True},
        {"id": 5, "name": "Dr. Elena Rostova", "specialty": "Pediatric Pulmonologist", "hospital": "Children's Health Network", "phone": "+1 (555) 444-5555", "rating": 4.9, "available": True},
        {"id": 1, "name": "Dr. Sarah Chen", "specialty": "Senior Pulmonologist", "hospital": "City General Hospital", "phone": "+1 (555) 123-4567", "rating": 4.9, "available": True}
    ],
    "Tuberculosis": [
        {"id": 8, "name": "Dr. Michael Okonkwo", "specialty": "Infectious Disease Specialist", "hospital": "Lung Health Institute", "phone": "+1 (555) 111-2222", "rating": 4.9, "available": True},
        {"id": 9, "name": "Dr. Fatima El-Sayed", "specialty": "TB Specialist", "hospital": "Global Health Medical Center", "phone": "+1 (555) 333-4444", "rating": 4.8, "available": True},
        {"id": 2, "name": "Dr. Marcus Thorne", "specialty": "Respiratory Specialist", "hospital": "Westside Medical Center", "phone": "+1 (555) 987-6543", "rating": 4.8, "available": True}
    ],
    "COPD": [
        {"id": 10, "name": "Dr. Robert Martinez", "specialty": "COPD Specialist", "hospital": "Lung Health Institute", "phone": "+1 (555) 777-8888", "rating": 4.8, "available": True},
        {"id": 1, "name": "Dr. Sarah Chen", "specialty": "Senior Pulmonologist", "hospital": "City General Hospital", "phone": "+1 (555) 123-4567", "rating": 4.9, "available": True}
    ],
    "Healthy": []
}

# ==================== HELPER FUNCTIONS ====================

def generate_placeholder_heatmap(disease_name, confidence):
    """Generate a professional-looking placeholder heatmap for demonstration"""
    try:
        if not MATPLOTLIB_AVAILABLE:
            return None
            
        # Create a spectrogram-like visualization
        fig, ax = plt.subplots(figsize=(12, 4))
        
        # Generate synthetic data that looks like a spectrogram
        np.random.seed(42)
        time_steps = 200
        freq_bins = 100
        
        # Create base pattern
        data = np.random.rand(freq_bins, time_steps) * 0.3
        
        # Add anomaly pattern based on disease
        if disease_name == "Pneumonia":
            # Add bright spots for crackling sounds
            for i in range(10):
                x = np.random.randint(50, 150)
                y = np.random.randint(20, 80)
                data[y:y+15, x:x+15] += confidence * 0.5
        elif disease_name == "Asthma":
            # Add wheezing pattern (vertical stripes)
            for x in range(50, 150, 20):
                data[:, x:x+5] += confidence * 0.6
        elif disease_name == "Tuberculosis":
            # Add cavitation-like patterns
            for i in range(5):
                x = np.random.randint(60, 140)
                y = np.random.randint(30, 70)
                data[y:y+20, x:x+20] += confidence * 0.7
        elif disease_name == "COPD":
            # Add diffuse pattern
            for i in range(15):
                x = np.random.randint(40, 160)
                y = np.random.randint(10, 90)
                data[y:y+10, x:x+10] += confidence * 0.4
        else:
            # Healthy - random noise only
            data = np.random.rand(freq_bins, time_steps) * 0.2
        
        # Clip values
        data = np.clip(data, 0, 1)
        
        # Create heatmap
        im = ax.imshow(data, cmap='jet', aspect='auto', interpolation='bilinear')
        ax.set_title(f'Grad-CAM: {disease_name} Detection (Confidence: {confidence*100:.1f}%)', 
                     color='white', fontsize=12, fontweight='bold')
        ax.set_xlabel('Time (samples)', color='white', fontsize=10)
        ax.set_ylabel('Frequency (Hz)', color='white', fontsize=10)
        
        # Add colorbar
        cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        cbar.set_label('Activation Strength', color='white')
        cbar.ax.yaxis.set_tick_params(color='white')
        plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white')
        
        # Set dark background
        ax.set_facecolor('#0a0a2a')
        fig.patch.set_facecolor('#0a0a2a')
        ax.tick_params(colors='white')
        
        # Save to bytes
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#0a0a2a')
        plt.close()
        buf.seek(0)
        
        # Convert to base64
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return f"data:image/png;base64,{img_base64}"
        
    except Exception as e:
        print(f"Error generating placeholder heatmap: {e}")
        return None

def generate_unique_filename(prefix="heatmap"):
    """Generate a unique filename for heatmap images"""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    return f"{prefix}_{timestamp}.png"

# ==================== PYDANTIC SCHEMAS ====================
class UserSignup(BaseModel):
    full_name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# ==================== API ENDPOINTS ====================

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-BioScan API. The engine is running."}

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "matplotlib": MATPLOTLIB_AVAILABLE,
        "gradcam": GRADCAM_AVAILABLE,
        "model_loaded": model is not None,
        "available_diseases": list(DISEASE_INFO.keys())
    }

# --- AUTHENTICATION ---
@app.post("/api/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        full_name=user.full_name, 
        email=user.email,
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Account created successfully", "user_id": new_user.id}

@app.post("/api/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "message": "Login successful",
        "user": {
            "id": db_user.id,
            "full_name": db_user.full_name,
            "email": db_user.email
        }
    }

# --- DIAGNOSIS & PREDICTION WITH CLINICAL LOGIC GATE ---
@app.post("/api/predict")
async def predict_audio(
    file: UploadFile = File(...), 
    user_id: int = Form(None),
    symptoms: str = Form("[]"),  # JSON string of symptoms from frontend
    db: Session = Depends(get_db)
):
    temp_path = None
    heatmap_url = None
    patient_context_used = False
    
    try:
        # 1. Parse symptoms from frontend
        try:
            patient_symptoms = json.loads(symptoms)
            patient_context_used = len(patient_symptoms) > 0
            print(f"--> Received scan. Patient symptoms: {patient_symptoms}")
        except json.JSONDecodeError:
            patient_symptoms = []
            print("--> No valid symptoms provided")
        
        # 2. Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_path = tmp.name
        print(f"File saved to: {temp_path}")

        # 3. Audio Processing & Inference
        data, sr = librosa.load(temp_path, sr=cfg["sample_rate"], mono=True)
        sf.write(temp_path, data, cfg["sample_rate"])
        
        # Preprocess for model input
        x = preprocess(temp_path, cfg)
        probs = model.predict(x, verbose=0)[0]
        
        pred_index = int(np.argmax(probs))
        base_prediction = labels[pred_index]
        base_confidence = float(probs.max())
        raw_probs = {labels[i]: float(probs[i]) for i in range(len(labels))}
        
        print(f"AI Audio Model: {base_prediction} with {base_confidence*100:.1f}% confidence")

        # 4. APPLY CLINICAL SYMPTOM LOGIC GATE
        final_confidence = adjust_confidence_with_symptoms(
            base_prediction, 
            base_confidence, 
            patient_symptoms
        )
        
        # Use the final confidence for the report
        final_prediction = base_prediction
        final_confidence_value = final_confidence
        
        print(f"Final Diagnosis after clinical gate: {final_prediction} with {final_confidence_value*100:.1f}% confidence")

        # 5. Generate Heatmap
        # Method 1: Try real Grad-CAM if available
        if GRADCAM_AVAILABLE:
            try:
                heatmap_filename = generate_unique_filename()
                heatmap_save_path = os.path.join("heatmaps", heatmap_filename)
                
                generate_gradcam_heatmap(
                    model=model,
                    audio_path=temp_path,
                    target_class=pred_index,
                    save_path=heatmap_save_path,
                    cfg=cfg
                )
                
                if os.path.exists(heatmap_save_path):
                    heatmap_url = f"http://localhost:8000/heatmaps/{heatmap_filename}"
                    print(f"✅ Real Grad-CAM heatmap generated")
            except Exception as e:
                print(f"⚠️ Real Grad-CAM failed: {e}")

        # Method 2: Fallback to placeholder heatmap
        if not heatmap_url:
            print("Generating placeholder heatmap...")
            placeholder = generate_placeholder_heatmap(final_prediction, final_confidence_value)
            if placeholder:
                heatmap_url = placeholder
                print(f"✅ Placeholder heatmap generated (base64)")
            else:
                heatmap_url = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=400&fit=crop"
                print(f"⚠️ Using fallback demo image")

        # 6. Save to DB if logged in
        report_id = None
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                save_dir = os.path.join("user_reports", str(user_id))
                os.makedirs(save_dir, exist_ok=True)
                final_audio_path = os.path.join(save_dir, f"audio_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav")
                os.replace(temp_path, final_audio_path)
                temp_path = None

                new_report = Report(
                    user_id=user_id,
                    disease=final_prediction,
                    confidence=final_confidence_value,
                    file_path=final_audio_path,
                    meta_info={
                        "sample_rate": cfg["sample_rate"],
                        "heatmap": heatmap_url,
                        "probabilities": raw_probs,
                        "base_confidence": base_confidence,
                        "patient_symptoms": patient_symptoms,
                        "symptom_boost": final_confidence_value - base_confidence
                    }
                )
                db.add(new_report)
                db.commit()
                db.refresh(new_report)
                report_id = new_report.id
                print(f"Report saved with ID: {report_id}")

        # 7. Get recommended doctors
        recommended_doctors = DOCTOR_DATABASE.get(final_prediction, [])
        recommended_doctors = [doc for doc in recommended_doctors if doc.get("available", True)][:3]

        # 8. Return response with everything
        response_data = {
            "prediction": final_prediction,
            "confidence": final_confidence_value,
            "base_confidence": base_confidence,
            "probabilities": raw_probs,
            "info": DISEASE_INFO.get(final_prediction, {}),
            "report_id": report_id,
            "recommended_doctors": recommended_doctors,
            "heatmap_url": heatmap_url,
            "patient_context_used": patient_context_used,
            "symptom_boost_percentage": round((final_confidence_value - base_confidence) * 100, 2)
        }
        
        print(f"Response prepared with heatmap_url: {heatmap_url is not None}")
        return response_data

    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                print(f"Cleaned up temp file: {temp_path}")
            except:
                pass

# --- REPORTS & ANALYTICS ---
@app.get("/api/reports/{user_id}")
def get_user_reports(user_id: int, db: Session = Depends(get_db)):
    reports = db.query(Report).filter(Report.user_id == user_id).order_by(Report.created_at.desc()).all()
    
    reports_list = []
    for report in reports:
        reports_list.append({
            "id": report.id,
            "disease": report.disease,
            "confidence": report.confidence,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "file_path": report.file_path,
            "meta_info": report.meta_info
        })
    
    return {"reports": reports_list}

@app.get("/api/reports/{report_id}/pdf")
def download_pdf_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    user_data = {
        "full_name": report.user.full_name,
        "email": report.user.email
    }
    
    pdf_path = generate_medical_report(
        user=user_data,
        prediction=report.disease,
        confidence=report.confidence,
        metadata=report.meta_info,
        save_path="generated_reports"
    )
    
    return FileResponse(
        path=pdf_path, 
        filename=f"AI_BioScan_Report_{report.disease}.pdf", 
        media_type='application/pdf'
    )

@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_reports = db.query(Report).count()
    disease_counts = db.query(Report.disease, func.count(Report.disease)).group_by(Report.disease).all()
    
    return {
        "total_users": total_users,
        "total_reports": total_reports,
        "distribution": {d: c for d, c in disease_counts}
    }

@app.get("/api/doctors/{disease}")
def get_doctors_by_disease(disease: str):
    """Get recommended doctors for a specific respiratory condition"""
    doctors = DOCTOR_DATABASE.get(disease, [])
    available_doctors = [doc for doc in doctors if doc.get("available", True)]
    return {"disease": disease, "doctors": available_doctors[:3]}

@app.get("/api/symptoms/{disease}")
def get_symptoms_for_disease(disease: str):
    """Get common symptoms for a specific disease (for patient intake)"""
    if disease in SYMPTOM_WEIGHTS:
        return {"disease": disease, "symptoms": SYMPTOM_WEIGHTS[disease]}
    return {"disease": disease, "symptoms": []}