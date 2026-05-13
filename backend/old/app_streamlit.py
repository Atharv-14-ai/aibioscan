import os
import json
import tempfile
import librosa
import soundfile as sf
from datetime import datetime
import streamlit as st
from sqlalchemy import func
from tensorflow.keras.models import load_model
from sqlalchemy.exc import IntegrityError

# --- Local imports ---
from src.config import load_config
from src.infer import preprocess
from src.db import get_db, init_db
from src.models import User, Report
from src.auth import hash_password, verify_password
from src.report_generator import generate_medical_report


# ==================== INIT ====================
init_db()
st.set_page_config(page_title="🧬 AI-BioScan Health Portal", layout="wide")
st.markdown(
    """
    <style>
    /* --------- GLOBAL STYLING --------- */
    .main {
        background: #f9fafb;
        padding: 1.5rem;
    }
    h1, h2, h3, h4 {
        color: #1e3a8a;
    }
    .stButton > button {
        background-color: #2563eb !important;
        color: white !important;
        border-radius: 6px;
        border: none;
        padding: 0.6rem 1rem;
        font-weight: 600;
    }
    .stButton > button:hover {
        background-color: #1d4ed8 !important;
    }
    .card {
        background-color: #ffffff;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0px 2px 6px rgba(0,0,0,0.1);
        margin-bottom: 1.5rem;
    }
    .metric-card {
        text-align: center;
        background-color: #f1f5f9;
        padding: 1rem;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
    }
    </style>
    """,
    unsafe_allow_html=True
)

st.sidebar.title("🧬 AI-BioScan")
st.sidebar.caption("Smart Respiratory Health Analysis")

# ==================== LOAD MODEL ====================
@st.cache_resource
def load_assets():
    cfg = load_config("config.yaml")
    model_path = os.path.join(cfg["model_dir"], cfg["model_name"])
    if not os.path.exists(model_path):
        st.error("Model file missing. Please ensure model is trained and placed in 'models/'.")
        st.stop()
    model = load_model(model_path, compile=False)
    with open(os.path.join(cfg["model_dir"], "label_map.json"), "r") as f:
        label_map = json.load(f)
    labels = [label_map[str(i)] for i in range(len(label_map))]
    return cfg, model, labels

cfg, model, labels = load_assets()
if "user" not in st.session_state:
    st.session_state.user = None


# ==================== MEDICAL INFO ====================
DISEASE_INFO = {
    "Pneumonia": {
        "desc": "Infection causing inflammation in the lungs, filling air sacs with fluid or pus.",
        "symptoms": ["Fever", "Cough with phlegm", "Chest pain", "Breathing difficulty"],
        "treatment": ["Antibiotics (if bacterial)", "Rest & fluids", "Doctor supervision"]
    },
    "Asthma": {
        "desc": "A chronic condition that narrows airways and causes wheezing and breathlessness.",
        "symptoms": ["Coughing", "Wheezing", "Shortness of breath"],
        "treatment": ["Inhalers", "Avoid allergens", "Doctor-prescribed medications"]
    },
    "COPD": {
        "desc": "Chronic Obstructive Pulmonary Disease that obstructs airflow from the lungs.",
        "symptoms": ["Shortness of breath", "Chronic cough", "Fatigue"],
        "treatment": ["Bronchodilators", "Oxygen therapy", "Smoking cessation"]
    },
    "Healthy": {
        "desc": "No abnormalities detected in respiratory patterns.",
        "symptoms": ["Normal breathing", "No significant anomalies"],
        "treatment": ["Maintain regular exercise", "Stay hydrated", "Avoid pollutants"]
    },
    "Tuberculosis": {
        "desc": "An infectious disease that mainly affects the lungs, caused by Mycobacterium tuberculosis.",
        "symptoms": ["Persistent cough (3+ weeks)", "Chest pain", "Coughing up blood", "Fatigue"],
        "treatment": ["Long-term antibiotics", "Isolation during infectious phase", "Specialist consultation"]
    }
}


# ==================== HELPERS ====================
def save_report_to_db(db_session, user_id, disease, confidence, file_path=None, metadata=None):
    try:
        rpt = Report(
            user_id=user_id,
            disease=disease,
            confidence=float(confidence),
            file_path=file_path,
            meta_info=metadata
        )
        db_session.add(rpt)
        db_session.commit()
        return rpt
    except Exception as e:
        db_session.rollback()
        st.error(f"Database error: {e}")
        return None


# ==================== SIDEBAR ====================
if st.session_state.user:
    st.sidebar.success(f"👋 {st.session_state.user['full_name']}")
    if st.sidebar.button("Logout"):
        st.session_state.user = None
        st.rerun()
else:
    st.sidebar.info("Please log in to save reports")

page = st.sidebar.radio(
    "Navigate",
    ["Login / Signup", "Diagnosis", "My Reports", "Analytics", "About"]
)


# ==================== LOGIN / SIGNUP ====================
if page == "Login / Signup":
    st.title("🔐 Login or Create Account")
    col1, col2 = st.columns(2)

    with col1:
        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.subheader("👤 Login")
        email = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_pw")
        if st.button("Login", key="login_btn"):
            with next(get_db()) as db:
                user = db.query(User).filter(User.email == email).first()
                if user and verify_password(password, user.password_hash):
                    st.session_state.user = {
                        "id": user.id,
                        "email": user.email,
                        "full_name": user.full_name,
                    }
                    st.success(f"✅ Welcome back, {user.full_name}!")
                    st.rerun()
                else:
                    st.error("❌ Invalid email or password")
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.subheader("🆕 Create Account")
        name = st.text_input("Full Name", key="signup_name")
        reg_email = st.text_input("Email", key="signup_email")
        reg_pw = st.text_input("Password", type="password", key="signup_pw")
        if st.button("Sign Up", key="signup_btn"):
            if not (name and reg_email and reg_pw):
                st.warning("⚠️ Please fill all fields.")
            else:
                with next(get_db()) as db:
                    if db.query(User).filter(User.email == reg_email).first():
                        st.warning("📧 Email already registered.")
                    else:
                        new_user = User(full_name=name, email=reg_email,
                                        password_hash=hash_password(reg_pw))
                        db.add(new_user)
                        db.commit()
                        st.success("🎉 Account created successfully! You can now log in.")
        st.markdown('</div>', unsafe_allow_html=True)


# ==================== DIAGNOSIS ====================
elif page == "Diagnosis":
    st.title("🎧 AI-Based Respiratory Diagnosis")
    st.markdown('<div class="card">', unsafe_allow_html=True)

    if not st.session_state.user:
        st.info("Login to save and generate reports securely.")

    file = st.file_uploader("Upload your cough/breath audio", type=["wav", "mp3", "flac", "ogg"])

    if file:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            data, sr = librosa.load(file, sr=cfg["sample_rate"], mono=True)
            sf.write(tmp.name, data, cfg["sample_rate"])
            x = preprocess(tmp.name, cfg)

        probs = model.predict(x, verbose=0)[0]
        pred_label = labels[int(probs.argmax())]
        conf = float(probs.max())

        st.markdown(f"### 🩺 Prediction: **{pred_label}**  |  Confidence: **{conf:.2%}**")
        st.progress(conf)
        st.json({labels[i]: float(probs[i]) for i in range(len(labels))})

        info = DISEASE_INFO.get(pred_label, {})
        if info:
            st.markdown(f"### 🧠 Medical Insight — {pred_label}")
            st.write(info["desc"])
            st.write("**Symptoms:**", ", ".join(info["symptoms"]))
            st.write("**Treatment Recommendations:**")
            for t in info["treatment"]:
                st.write(f"- {t}")

        col1, col2 = st.columns(2)
        with col1:
            if st.button("💾 Save Report"):
                if not st.session_state.user:
                    st.warning("Please log in first.")
                else:
                    save_dir = os.path.join("user_reports", str(st.session_state.user["id"]))
                    os.makedirs(save_dir, exist_ok=True)
                    out_path = os.path.join(save_dir, f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav")
                    os.replace(tmp.name, out_path)

                    with next(get_db()) as db:
                        save_report_to_db(
                            db_session=db,
                            user_id=st.session_state.user["id"],
                            disease=pred_label,
                            confidence=conf,
                            file_path=out_path,
                            metadata={"sample_rate": cfg["sample_rate"]}
                        )
                    st.success("✅ Report saved successfully!")
        with col2:
            if st.button("📄 Generate PDF Report"):
                if not st.session_state.user:
                    st.warning("Login required for personalized PDF.")
                else:
                    pdf_path = generate_medical_report(
                        user=st.session_state.user,
                        prediction=pred_label,
                        confidence=conf,
                        metadata={"sample_rate": cfg["sample_rate"]},
                        save_path="generated_reports"
                    )
                    st.success("📄 PDF report generated successfully.")
                    with open(pdf_path, "rb") as f:
                        st.download_button("⬇️ Download Medical Report", f, file_name=os.path.basename(pdf_path))

    st.markdown('</div>', unsafe_allow_html=True)


# ==================== MY REPORTS ====================
elif page == "My Reports":
    st.title("📁 My Medical Reports")
    if not st.session_state.user:
        st.warning("Please log in to access your saved reports.")
    else:
        with next(get_db()) as db:
            reports = db.query(Report).filter(
                Report.user_id == st.session_state.user["id"]
            ).order_by(Report.created_at.desc()).all()

        if not reports:
            st.info("No reports found yet.")
        else:
            for r in reports:
                st.markdown('<div class="card">', unsafe_allow_html=True)
                st.markdown(f"🗓️ **{r.created_at.strftime('%Y-%m-%d %H:%M:%S')}** — **{r.disease}** ({r.confidence:.2%})")
                if r.file_path and os.path.exists(r.file_path):
                    st.audio(r.file_path)
                if st.button(f"📄 Generate PDF for {r.disease}", key=f"pdf_{r.id}"):
                    pdf_path = generate_medical_report(
                        user=st.session_state.user,
                        prediction=r.disease,
                        confidence=r.confidence,
                        metadata=r.meta_info,
                        save_path="generated_reports"
                    )
                    st.success("✅ PDF generated successfully.")
                    with open(pdf_path, "rb") as f:
                        st.download_button("⬇️ Download Report", f, file_name=os.path.basename(pdf_path))
                st.markdown('</div>', unsafe_allow_html=True)


# ==================== ANALYTICS ====================
elif page == "Analytics":
    st.title("📊 AI-BioScan Analytics Dashboard")
    with next(get_db()) as db:
        total_users = db.query(User).count()
        total_reports = db.query(Report).count()
        disease_counts = db.query(Report.disease, func.count(Report.disease)).group_by(Report.disease).all()

    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="metric-card">', unsafe_allow_html=True)
        st.metric("👥 Total Users", total_users)
        st.markdown('</div>', unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="metric-card">', unsafe_allow_html=True)
        st.metric("🩺 Total Reports", total_reports)
        st.markdown('</div>', unsafe_allow_html=True)

    if disease_counts:
        import plotly.express as px
        df = {"Disease": [d for d, _ in disease_counts], "Count": [c for _, c in disease_counts]}
        fig = px.pie(df, names="Disease", values="Count", title="Disease Distribution")
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No data available yet.")


# ==================== ABOUT ====================
elif page == "About":
    st.title("ℹ️ About AI-BioScan")
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.markdown("""
    **AI-BioScan** is a deep learning-based health portal that predicts respiratory diseases from cough and breath audio.

    ### 🌟 Core Features:
    - 🔐 Secure Login System  
    - 🎧 AI Diagnosis using CNNs  
    - 📄 PDF Medical Report Generation  
    - 📊 Real-Time Analytics Dashboard  

    ⚠️ **Disclaimer:** This system is for research and educational purposes only.  
    Always consult a certified medical professional for real diagnosis.
    """)
    st.markdown('</div>', unsafe_allow_html=True)
