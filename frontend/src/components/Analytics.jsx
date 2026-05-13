import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Stethoscope, AlertCircle, Activity, HeartPulse } from "lucide-react";

function ClinicalOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Clinical color palette
  const COLORS = {
    Healthy: "#10b981",
    Pneumonia: "#ef4444",
    Asthma: "#f59e0b",
    Tuberculosis: "#8b5cf6",
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/analytics");
        const chartData = Object.entries(res.data.distribution).map(
          ([name, value]) => ({
            name,
            value,
          }),
        );
        setData({ ...res.data, chartData });
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading)
    return (
      <div
        className="flex-center"
        style={{ padding: "4rem", minHeight: "400px" }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="spin"
            style={{ fontSize: "2rem", marginBottom: "1rem" }}
          >
            🫁
          </div>
          <p style={{ color: "#94a3b8" }}>Loading clinical data...</p>
        </div>
      </div>
    );

  if (!data)
    return (
      <div
        className="glass-card"
        style={{ textAlign: "center", padding: "3rem" }}
      >
        <AlertCircle
          size={48}
          color="#ef4444"
          style={{ marginBottom: "1rem" }}
        />
        <p style={{ color: "#94a3b8" }}>
          Failed to load clinical data. Please try again.
        </p>
      </div>
    );

  // Calculate high-risk detections (Pneumonia + Asthma + TB)
  const highRiskDetections = data.chartData
    .filter((d) => d.name !== "Healthy")
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: "clamp(1rem, 5vw, 2rem)" }}
    >
      {/* Header Section */}
      <div
        style={{
          marginBottom: "clamp(1.5rem, 5vw, 2rem)",
          display: "flex",
          alignItems: "center",
          gap: "clamp(0.75rem, 3vw, 1rem)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: "rgba(13, 148, 136, 0.15)",
            padding: "clamp(0.5rem, 2vw, 0.75rem)",
            borderRadius: "16px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(45, 212, 191, 0.3)",
          }}
        >
          <HeartPulse size={clamp(24, 5, 32)} color="#2dd4bf" />
        </div>
        <div>
          <h2
            style={{
              fontSize: "clamp(1.3rem, 5vw, 2rem)",
              color: "#f8fafc",
              margin: 0,
              fontWeight: "700",
            }}
          >
            Epidemiology Overview
          </h2>
          <p
            style={{
              color: "#94a3b8",
              margin: "0.25rem 0 0 0",
              fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
            }}
          >
            Aggregated respiratory health trends and patient screening data
          </p>
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: "clamp(1rem, 3vw, 1.5rem)",
          marginBottom: "clamp(2rem, 6vw, 3rem)",
        }}
      >
        {/* Total Patients Card */}
        <div
          className="metric-box"
          style={{
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(10px)",
            borderLeft: "4px solid #2dd4bf",
            padding: "clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          <div
            className="metric-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#2dd4bf",
              fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)",
            }}
          >
            <Stethoscope size={clamp(14, 4, 18)} /> Patients Screened
          </div>
          <div
            style={{
              fontSize: "clamp(1.8rem, 7vw, 2.5rem)",
              fontWeight: "800",
              color: "#f8fafc",
              marginTop: "0.5rem",
            }}
          >
            {data.total_users}
          </div>
        </div>

        {/* High-Risk Detections Card */}
        <div
          className="metric-box"
          style={{
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(10px)",
            borderLeft: "4px solid #ef4444",
            padding: "clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          <div
            className="metric-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#ef4444",
              fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)",
            }}
          >
            <AlertCircle size={clamp(14, 4, 18)} /> High-Risk Detections
          </div>
          <div
            style={{
              fontSize: "clamp(1.8rem, 7vw, 2.5rem)",
              fontWeight: "800",
              color: "#f8fafc",
              marginTop: "0.5rem",
            }}
          >
            {highRiskDetections}
          </div>
        </div>

        {/* Total Scans Card */}
        <div
          className="metric-box"
          style={{
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(10px)",
            borderLeft: "4px solid #38bdf8",
            padding: "clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          <div
            className="metric-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#38bdf8",
              fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)",
            }}
          >
            <Activity size={clamp(14, 4, 18)} /> Total Scans Analyzed
          </div>
          <div
            style={{
              fontSize: "clamp(1.8rem, 7vw, 2.5rem)",
              fontWeight: "800",
              color: "#f8fafc",
              marginTop: "0.5rem",
            }}
          >
            {data.total_reports}
          </div>
        </div>
      </div>

      {/* Bottom Section - Chart & Alerts (Responsive Grid) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "clamp(1rem, 3vw, 1.5rem)",
        }}
      >
        {/* Left Side: Chart */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(8px)",
            padding: "clamp(1rem, 4vw, 1.5rem)",
            borderRadius: "16px",
            border: "1px solid rgba(125, 211, 252, 0.15)",
          }}
        >
          <h3
            style={{
              color: "#f8fafc",
              marginBottom: "clamp(1rem, 4vw, 1.5rem)",
              fontSize: "clamp(1rem, 4vw, 1.2rem)",
              fontWeight: "600",
            }}
          >
            Pathology Distribution
          </h3>
          <div
            style={{
              height: "clamp(250px, 50vw, 300px)",
              width: "100%",
              minHeight: "250px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={clamp(60, 15, 80)}
                  outerRadius={clamp(80, 20, 110)}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {data.chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(125, 211, 252, 0.2)",
                    background: "rgba(11, 21, 33, 0.95)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                  }}
                  itemStyle={{ fontWeight: "600", color: "#f8fafc" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Section for better mobile understanding */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "clamp(0.75rem, 3vw, 1rem)",
              marginTop: "clamp(1rem, 4vw, 1.5rem)",
              paddingTop: "clamp(0.75rem, 3vw, 1rem)",
              borderTop: "1px solid rgba(125, 211, 252, 0.1)",
            }}
          >
            {data.chartData.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "clamp(0.7rem, 2.5vw, 0.8rem)",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: COLORS[entry.name] || "#94a3b8",
                  }}
                />
                <span style={{ color: "#cbd5e1" }}>{entry.name}</span>
                <span style={{ color: "#f8fafc", fontWeight: "600" }}>
                  ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Clinical Action Items */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(8px)",
            padding: "clamp(1rem, 4vw, 1.5rem)",
            borderRadius: "16px",
            border: "1px solid rgba(125, 211, 252, 0.15)",
          }}
        >
          <h3
            style={{
              color: "#f8fafc",
              marginBottom: "clamp(1rem, 4vw, 1.5rem)",
              fontSize: "clamp(1rem, 4vw, 1.2rem)",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={clamp(18, 5, 22)} color="#f59e0b" />
            Clinical Alerts
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.75rem, 3vw, 1rem)",
            }}
          >
            {/* Alert 1 - Pneumonia */}
            <div
              style={{
                padding: "clamp(0.75rem, 3vw, 1rem)",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "12px",
                borderLeft: "3px solid #ef4444",
                transition: "transform 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateX(4px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateX(0)")
              }
            >
              <strong
                style={{
                  color: "#fca5a5",
                  fontSize: "clamp(0.85rem, 3vw, 0.9rem)",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                ⚠️ Elevated Pneumonia Rates
              </strong>
              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: "clamp(0.75rem, 2.5vw, 0.8rem)",
                  lineHeight: "1.4",
                }}
              >
                Recent scans indicate increased pneumonia detections in the
                region. Recommend enhanced screening protocols.
              </span>
            </div>

            {/* Alert 2 - Asthma */}
            <div
              style={{
                padding: "clamp(0.75rem, 3vw, 1rem)",
                background: "rgba(245, 158, 11, 0.1)",
                borderRadius: "12px",
                borderLeft: "3px solid #f59e0b",
                transition: "transform 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateX(4px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateX(0)")
              }
            >
              <strong
                style={{
                  color: "#fcd34d",
                  fontSize: "clamp(0.85rem, 3vw, 0.9rem)",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                🌸 Asthma Season Warning
              </strong>
              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: "clamp(0.75rem, 2.5vw, 0.8rem)",
                  lineHeight: "1.4",
                }}
              >
                Current environmental conditions show high pollen counts. Asthma
                patients should take preventive measures.
              </span>
            </div>

            {/* Alert 3 - General Recommendation */}
            <div
              style={{
                padding: "clamp(0.75rem, 3vw, 1rem)",
                background: "rgba(56, 189, 248, 0.1)",
                borderRadius: "12px",
                borderLeft: "3px solid #38bdf8",
                transition: "transform 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateX(4px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateX(0)")
              }
            >
              <strong
                style={{
                  color: "#7dd3fc",
                  fontSize: "clamp(0.85rem, 3vw, 0.9rem)",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                💡 AI Screening Recommendation
              </strong>
              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: "clamp(0.75rem, 2.5vw, 0.8rem)",
                  lineHeight: "1.4",
                }}
              >
                Based on recent trends, prioritize TB screening for high-risk
                demographics in the coming weeks.
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function for clamping values
function clamp(value, min, max) {
  if (typeof window === "undefined") return max;
  const screenWidth = window.innerWidth;
  if (screenWidth <= 480) return min;
  if (screenWidth >= 1024) return max;
  // Linear interpolation for medium screens
  return min + (max - min) * ((screenWidth - 480) / (1024 - 480));
}

export default ClinicalOverview;
