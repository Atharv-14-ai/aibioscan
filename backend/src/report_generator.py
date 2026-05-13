from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from datetime import datetime
import os

def generate_medical_report(user, prediction, confidence, metadata=None, save_path="reports"):
    """
    Generates a clinical-style PDF medical report.
    """
    os.makedirs(save_path, exist_ok=True)
    report_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    file_path = os.path.join(save_path, f"report_{report_id}.pdf")

    doc = SimpleDocTemplate(file_path, pagesize=A4)
    styles = getSampleStyleSheet()
    elems = []

    # --- Header ---
    elems.append(Paragraph("<b>AI-BioScan Diagnostic Center</b>", styles["Title"]))
    elems.append(Paragraph("Respiratory Disease Analysis Report", styles["Heading2"]))
    elems.append(Spacer(1, 12))

    # --- Patient Info ---
    user_name = user.get("full_name", "Anonymous")
    user_email = user.get("email", "N/A")
    info = [
        ["Patient Name:", user_name],
        ["Email:", user_email],
        ["Report ID:", report_id],
        ["Date:", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
    ]
    table = Table(info, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ]))
    elems.append(table)
    elems.append(Spacer(1, 12))

    # --- Diagnosis ---
    elems.append(Paragraph("<b>Diagnosis Result</b>", styles["Heading2"]))
    result_table = Table([
        ["Predicted Condition:", prediction],
        ["Confidence Score:", f"{confidence*100:.2f}%"],
    ], colWidths=[2*inch, 4*inch])
    result_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ]))
    elems.append(result_table)
    elems.append(Spacer(1, 12))

    # --- Interpretation ---
    interpretation = {
        "Pneumonia": "Indicative of inflammation in the lungs due to infection. Immediate medical consultation advised.",
        "Asthma": "Shows airway constriction patterns. Regular inhaler use and avoiding triggers recommended.",
        "Tuberculosis": "Possible infection with Mycobacterium tuberculosis. Consult a chest specialist immediately.",
        "Healthy": "No abnormal respiratory patterns detected.",
    }
    elems.append(Paragraph("<b>Medical Interpretation:</b>", styles["Heading2"]))
    elems.append(Paragraph(interpretation.get(prediction, "Consult a physician for detailed diagnosis."), styles["Normal"]))
    elems.append(Spacer(1, 12))

    # --- Recommendations ---
    remedies = {
        "Pneumonia": [
            "Drink warm fluids and rest adequately.",
            "Avoid smoking or exposure to pollutants.",
            "Seek antibiotics as prescribed by a doctor."
        ],
        "Asthma": [
            "Keep rescue inhaler handy.",
            "Avoid allergens, dust, and cold air.",
            "Use steam inhalation for relief."
        ],
        "Tuberculosis": [
            "Complete full course of TB medications.",
            "Eat protein-rich foods and stay isolated until recovery.",
            "Consult pulmonologist for follow-up tests."
        ],
        "Healthy": [
            "Maintain a balanced diet and hydration.",
            "Continue regular exercise and deep breathing routines."
        ]
    }

    elems.append(Paragraph("<b>Recommendations / Home Remedies:</b>", styles["Heading2"]))
    for tip in remedies.get(prediction, []):
        elems.append(Paragraph(f"• {tip}", styles["Normal"]))
    elems.append(Spacer(1, 20))

    elems.append(Paragraph("<i>Disclaimer: This AI-based diagnosis is for informational purposes only. Please consult a qualified medical professional for confirmation.</i>", styles["Italic"]))
    elems.append(Spacer(1, 20))
    elems.append(Paragraph("Authorized Signature: ____________________", styles["Normal"]))

    doc.build(elems)
    return file_path
