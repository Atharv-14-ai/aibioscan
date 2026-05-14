import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  BookOpen,
  Wind,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import API from "../services/api";

function Dashboard({ user }) {
  const [data, setData] = useState({
    totalScans: 0,
    anomalies: 0,
    healthy: 0,
    recentReports: [],
    loading: true,
  });

  // --- NEW: Environmental State ---
  const [envData, setEnvData] = useState({
    aqi: null,
    pm25: null,
    status: "loading",
    error: false,
  });

  // Fetch Patient History
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch the user's actual reports from the backend
        const res = await API.get(`/api/reports/${user.id}`);
        const reports = res.data.reports;

        // Calculate dynamic stats
        const anomaliesCount = reports.filter(
          (r) => r.disease !== "Healthy",
        ).length;
        const healthyCount = reports.filter(
          (r) => r.disease === "Healthy",
        ).length;

        setData({
          totalScans: reports.length,
          anomalies: anomaliesCount,
          healthy: healthyCount,
          recentReports: reports.slice(0, 3),
          loading: false,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, [user.id]);

  // --- NEW: Fetch Live Kolhapur Air Quality ---
  useEffect(() => {
    const fetchEnvironment = async () => {
      try {
        // Coordinates for Kolhapur, Maharashtra
        const lat = 16.705;
        const lon = 74.2433;

        // Call the free Open-Meteo Air Quality API
        const res = await axios.get(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi`,
        );

        const currentAqi = res.data.current.us_aqi;
        const currentPm25 = res.data.current.pm2_5;

        // Logic Gate: Determine the threat level based on US EPA Standards
        let currentStatus = "safe";
        if (currentAqi > 100) currentStatus = "danger";
        else if (currentAqi > 50) currentStatus = "warning";

        setEnvData({
          aqi: currentAqi,
          pm25: currentPm25,
          status: currentStatus,
          error: false,
        });
      } catch (err) {
        console.error("Failed to fetch environmental data", err);
        setEnvData((prev) => ({ ...prev, status: "error", error: true }));
      }
    };
    fetchEnvironment();
  }, []);

  // Educational Data for the Health Hub
  const diseaseInfo = [
    {
      name: "Pneumonia",
      emoji: "🫁",
      desc: "An infection that inflames the air sacs in one or both lungs, which may fill with fluid or pus.",
      symptoms: [
        "Cough with phlegm",
        "Fever",
        "Chills",
        "Difficulty breathing",
      ],
    },
    {
      name: "Asthma",
      emoji: "😮‍💨",
      desc: "A condition in which your airways narrow and swell, often producing extra mucus.",
      symptoms: ["Shortness of breath", "Chest tightness", "Wheezing"],
    },
    {
      name: "Tuberculosis (TB)",
      emoji: "🦠",
      desc: "A potentially serious infectious bacterial disease that mainly affects the lungs.",
      symptoms: ["Persistent cough", "Chest pain", "Night sweats", "Fatigue"],
    },
    {
      name: "COPD",
      emoji: "🚬",
      desc: "Chronic inflammatory lung disease that causes obstructed airflow from the lungs.",
      symptoms: ["Frequent coughing", "Excess mucus", "Wheezing"],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div
        className="welcome-banner"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              color: "#f8fafc",
              fontSize: "clamp(1.5rem, 5vw, 2rem)",
              marginBottom: "0.5rem",
              marginTop: 0,
            }}
          >
            Welcome back, {user.full_name}
          </h1>
          <p
            style={{
              color: "#94a3b8",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <MapPin size={16} color="#38bdf8" /> Live monitoring for Kolhapur,
            MH
          </p>
        </div>
        <Link
          to="/scan"
          className="btn-premium"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Activity size={20} />
          Start New Scan
        </Link>
      </div>

      {/* ================================================ */}
      {/* DYNAMIC ENVIRONMENTAL BANNER                      */}
      {/* ================================================ */}
      {!envData.error && envData.status !== "loading" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`env-banner ${envData.status}`}
        >
          <div className="env-content">
            <div className="env-icon-wrapper">
              {envData.status === "safe" && <CheckCircle size={28} />}
              {envData.status === "warning" && <Wind size={28} />}
              {envData.status === "danger" && <AlertTriangle size={28} />}
            </div>
            <div>
              <h3 className="env-title">
                {envData.status === "safe" && "Optimal Respiratory Conditions"}
                {envData.status === "warning" && "Moderate Air Quality Alert"}
                {envData.status === "danger" &&
                  "⚠️ Hazardous Air Quality Detected"}
              </h3>
              <p className="env-desc">
                {envData.status === "safe" &&
                  "Local air quality is currently safe for outdoor activities."}
                {envData.status === "warning" &&
                  "Unusually sensitive patients should consider reducing prolonged outdoor exertion."}
                {envData.status === "danger" &&
                  "High levels of particulate matter. Asthma and COPD patients should remain indoors."}
              </p>
            </div>
          </div>

          <div className="env-metrics">
            <div className="env-metric-item">
              <span className="env-metric-value">{envData.aqi}</span>
              <span className="env-metric-label">US AQI</span>
            </div>
            <div className="env-metric-item">
              <span className="env-metric-value">{envData.pm25}</span>
              <span className="env-metric-label">PM2.5 (µg/m³)</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================================================ */}
      {/* RESPIRATORY HEALTH HUB (EDUCATIONAL SECTION)       */}
      {/* ================================================ */}
      <div
        className="glass-card"
        style={{ marginTop: "2rem", padding: "clamp(1rem, 4vw, 2rem)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <BookOpen color="#38bdf8" size={24} />
          <h2 style={{ fontSize: "1.2rem", color: "#f8fafc", margin: 0 }}>
            Respiratory Health Hub
          </h2>
        </div>
        <p
          style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "2rem" }}
        >
          Learn about the specific conditions our AI analyzes during a
          respiratory scan.
        </p>

        {/* 2-COLUMN GRID THAT RESPONDS TO MOBILE */}
        <div
          className="health-hub-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1.5rem",
          }}
        >
          {diseaseInfo.map((disease, idx) => (
            <motion.div
              key={idx}
              className="disease-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              style={{
                background: "rgba(15, 23, 42, 0.4)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(125, 211, 252, 0.1)",
                borderRadius: "16px",
                padding: "clamp(1rem, 3vw, 1.5rem)",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "rgba(13, 148, 136, 0.15)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    border: "1px solid rgba(45, 212, 191, 0.2)",
                  }}
                >
                  {disease.emoji}
                </div>
                <h4
                  style={{
                    color: "#f8fafc",
                    margin: 0,
                    fontSize: "clamp(1rem, 4vw, 1.1rem)",
                  }}
                >
                  {disease.name}
                </h4>
              </div>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "clamp(0.8rem, 3vw, 0.85rem)",
                  lineHeight: "1.5",
                  marginBottom: "1.25rem",
                }}
              >
                {disease.desc}
              </p>

              <div style={{ marginTop: "auto" }}>
                <strong
                  style={{
                    display: "block",
                    color: "#cbd5e1",
                    fontSize: "0.75rem",
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Key Symptoms
                </strong>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {disease.symptoms.map((sym, i) => (
                    <span
                      key={i}
                      style={{
                        background: "rgba(56, 189, 248, 0.1)",
                        color: "#38bdf8",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        fontWeight: "500",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                      }}
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Reports Section */}
      {!data.loading && data.recentReports.length > 0 && (
        <div
          className="glass-card"
          style={{ marginTop: "2rem", padding: "clamp(1rem, 4vw, 2rem)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <Clock color="#38bdf8" size={24} />
            <h2 style={{ fontSize: "1.2rem", color: "#f8fafc", margin: 0 }}>
              Recent Reports
            </h2>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {data.recentReports.map((report) => (
              <div
                key={report.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  background: "rgba(15, 23, 42, 0.4)",
                  borderRadius: "12px",
                  border: "1px solid rgba(56, 189, 248, 0.1)",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <div style={{ color: "#f8fafc", fontWeight: "600" }}>
                    {report.disease}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                    {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div
                  style={{
                    color: report.disease === "Healthy" ? "#10b981" : "#f59e0b",
                    fontWeight: "600",
                  }}
                >
                  {(report.confidence * 100).toFixed(1)}% confidence
                </div>
              </div>
            ))}
          </div>
          {data.totalScans > 3 && (
            <Link
              to="/reports"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                marginTop: "1.5rem",
                color: "#38bdf8",
                textDecoration: "none",
                fontSize: "0.9rem",
              }}
            >
              View all {data.totalScans} reports <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default Dashboard;
