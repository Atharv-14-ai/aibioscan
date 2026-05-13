import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Clock,
  Activity,
  FileDown,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function History({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterDisease, setFilterDisease] = useState("all");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(
        `http://localhost:8000/api/reports/${user.id}`,
      );
      setReports(res.data.reports);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setError(
        err.response?.data?.message ||
          "Failed to load patient records. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const diseases = ["all", ...new Set(reports.map((r) => r.disease))];

  const filteredReports = reports
    .filter(
      (report) => filterDisease === "all" || report.disease === filterDisease,
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getDiseaseColor = (disease) => {
    const colors = {
      Healthy: "#10b981",
      Pneumonia: "#ef4444",
      Asthma: "#f59e0b",
      Tuberculosis: "#8b5cf6",
      COPD: "#3b82f6",
    };
    return colors[disease] || "#94a3b8";
  };

  // Helper function to format ID for display (handles both string and number)
  const formatReportId = (id) => {
    const idString = String(id); // Convert to string safely
    return idString.slice(-6);
  };

  const LoadingSkeleton = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            padding: "clamp(1rem, 4vw, 1.5rem)",
            background: "rgba(30, 41, 59, 0.3)",
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          <div
            style={{
              height: "clamp(20px, 5vw, 24px)",
              width: "60%",
              background: "rgba(148, 163, 184, 0.2)",
              borderRadius: "8px",
              marginBottom: "0.5rem",
            }}
          />
          <div
            style={{
              height: "clamp(14px, 3vw, 16px)",
              width: "40%",
              background: "rgba(148, 163, 184, 0.15)",
              borderRadius: "8px",
            }}
          />
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ marginTop: "2rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            borderBottom: "1px solid rgba(56, 189, 248, 0.15)",
            paddingBottom: "clamp(1rem, 4vw, 1.5rem)",
            marginBottom: "clamp(1rem, 4vw, 1.5rem)",
            flexWrap: "wrap",
          }}
        >
          <Clock color="#38bdf8" size={28} />
          <h2
            style={{
              margin: 0,
              color: "#f8fafc",
              fontSize: "clamp(1.3rem, 5vw, 1.8rem)",
            }}
          >
            Patient History
          </h2>
        </div>
        <LoadingSkeleton />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ marginTop: "2rem", textAlign: "center", padding: "3rem" }}
      >
        <AlertCircle
          size={48}
          color="#ef4444"
          style={{ marginBottom: "1rem" }}
        />
        <p
          style={{
            color: "#f8fafc",
            fontSize: "clamp(0.9rem, 4vw, 1rem)",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </p>
        <button
          onClick={fetchReports}
          style={{
            background: "rgba(56, 189, 248, 0.15)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ marginTop: "2rem", padding: "clamp(1rem, 4vw, 2rem)" }}
    >
      {/* Header with Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "clamp(0.75rem, 3vw, 1rem)",
          borderBottom: "1px solid rgba(56, 189, 248, 0.15)",
          paddingBottom: "clamp(1rem, 4vw, 1.5rem)",
          marginBottom: "clamp(1rem, 4vw, 1.5rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <Clock color="#38bdf8" size={28} />
          <h2
            style={{
              margin: 0,
              color: "#f8fafc",
              fontSize: "clamp(1.3rem, 5vw, 1.8rem)",
            }}
          >
            Patient History
          </h2>
          {reports.length > 0 && (
            <span
              style={{
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                fontSize: "clamp(0.7rem, 3vw, 0.85rem)",
                fontWeight: "600",
              }}
            >
              {reports.length} {reports.length === 1 ? "record" : "records"}
            </span>
          )}
        </div>

        {reports.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <select
              value={filterDisease}
              onChange={(e) => setFilterDisease(e.target.value)}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "clamp(0.8rem, 3vw, 0.85rem)",
                outline: "none",
              }}
            >
              {diseases.map((disease) => (
                <option
                  key={disease}
                  value={disease}
                  style={{ background: "#1e293b" }}
                >
                  {disease === "all" ? "All Conditions" : disease}
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(15, 23, 42, 0.6)",
                color: "#94a3b8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "clamp(0.8rem, 3vw, 0.85rem)",
                transition: "all 0.2s ease",
              }}
            >
              <Filter size={16} />
              {sortOrder === "desc" ? "Newest First" : "Oldest First"}
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredReports.length === 0 && reports.length > 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "clamp(2rem, 8vw, 3rem)",
            background: "rgba(15, 23, 42, 0.4)",
            borderRadius: "12px",
            border: "1px dashed rgba(56, 189, 248, 0.3)",
          }}
        >
          <AlertCircle
            size={48}
            color="#64748b"
            style={{ marginBottom: "1rem" }}
          />
          <p
            style={{ color: "#94a3b8", fontSize: "clamp(0.9rem, 4vw, 1.1rem)" }}
          >
            No {filterDisease !== "all" ? filterDisease : ""} reports found
          </p>
          <button
            onClick={() => setFilterDisease("all")}
            style={{
              marginTop: "1rem",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {filteredReports.length === 0 && reports.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "clamp(2rem, 8vw, 3rem)",
            background: "rgba(15, 23, 42, 0.4)",
            borderRadius: "12px",
            border: "1px dashed rgba(56, 189, 248, 0.3)",
          }}
        >
          <Activity
            size={56}
            color="#64748b"
            style={{ marginBottom: "1rem" }}
          />
          <p
            style={{ color: "#94a3b8", fontSize: "clamp(0.9rem, 4vw, 1.1rem)" }}
          >
            No past diagnostic reports found
          </p>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
              marginTop: "0.5rem",
            }}
          >
            Complete a new scan to see it listed here
          </p>
        </div>
      )}

      {/* Reports List */}
      {filteredReports.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.75rem, 2vw, 1rem)",
          }}
        >
          <AnimatePresence>
            {filteredReports.map((report, index) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: Math.min(index * 0.05, 0.5) }}
                key={report.id}
                style={{
                  padding: "clamp(1rem, 4vw, 1.5rem)",
                  background: "rgba(30, 41, 59, 0.4)",
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Main Row - Desktop & Mobile Optimized */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  {/* Left Column - Disease Info */}
                  <div style={{ flex: "2", minWidth: "180px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <strong
                        style={{
                          color: getDiseaseColor(report.disease),
                          fontSize: "clamp(1rem, 4vw, 1.2rem)",
                          fontWeight: "700",
                        }}
                      >
                        {report.disease}
                      </strong>
                      <span
                        style={{
                          background: "rgba(148, 163, 184, 0.15)",
                          color: "#94a3b8",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          fontSize: "clamp(0.65rem, 2.5vw, 0.75rem)",
                          fontWeight: "500",
                        }}
                      >
                        ID: {formatReportId(report.id)}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: "clamp(0.7rem, 3vw, 0.85rem)",
                      }}
                    >
                      {new Date(report.created_at).toLocaleString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Right Column - Confidence + Buttons (ALWAYS TOGETHER) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      flex: "1",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* Confidence Score Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "rgba(56, 189, 248, 0.15)",
                        color: "#38bdf8",
                        padding: "0.5rem 1rem",
                        borderRadius: "999px",
                        fontWeight: "600",
                        fontSize: "clamp(0.85rem, 3vw, 0.95rem)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Activity size={18} />
                      {(report.confidence * 100).toFixed(1)}%
                    </div>

                    {/* Download PDF Button - ALWAYS VISIBLE NEXT TO SCORE */}
                    <button
                      onClick={() =>
                        window.open(
                          `http://localhost:8000/api/reports/${report.id}/pdf`,
                          "_blank",
                        )
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background:
                          "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                        color: "white",
                        border: "1px solid rgba(45, 212, 191, 0.5)",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 15px rgba(13, 148, 136, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onTouchStart={(e) => {
                        e.currentTarget.style.transform = "scale(0.97)";
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <FileDown size={18} />
                      <span>Download PDF</span>
                    </button>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleExpand(report.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(148, 163, 184, 0.15)",
                        color: "#94a3b8",
                        border: "1px solid rgba(148, 163, 184, 0.3)",
                        padding: "0.5rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        minWidth: "38px",
                        minHeight: "38px",
                      }}
                    >
                      {expandedId === report.id ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                <AnimatePresence>
                  {expandedId === report.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid rgba(148, 163, 184, 0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "1rem",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color: "#94a3b8",
                              fontSize: "0.75rem",
                              textTransform: "uppercase",
                            }}
                          >
                            Full Report ID
                          </strong>
                          <p
                            style={{
                              color: "#f8fafc",
                              fontSize: "0.85rem",
                              marginTop: "0.25rem",
                              wordBreak: "break-all",
                            }}
                          >
                            {report.id}
                          </p>
                        </div>
                        <div>
                          <strong
                            style={{
                              color: "#94a3b8",
                              fontSize: "0.75rem",
                              textTransform: "uppercase",
                            }}
                          >
                            AI Confidence
                          </strong>
                          <p
                            style={{
                              color: "#f8fafc",
                              fontSize: "0.85rem",
                              marginTop: "0.25rem",
                            }}
                          >
                            {(report.confidence * 100).toFixed(2)}% certainty
                          </p>
                        </div>
                        <div>
                          <strong
                            style={{
                              color: "#94a3b8",
                              fontSize: "0.75rem",
                              textTransform: "uppercase",
                            }}
                          >
                            Analysis Date
                          </strong>
                          <p
                            style={{
                              color: "#f8fafc",
                              fontSize: "0.85rem",
                              marginTop: "0.25rem",
                            }}
                          >
                            {new Date(report.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Note */}
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "0.75rem",
                          background: "rgba(56, 189, 248, 0.05)",
                          borderRadius: "8px",
                          border: "1px solid rgba(56, 189, 248, 0.1)",
                        }}
                      >
                        <p
                          style={{
                            color: "#94a3b8",
                            fontSize: "0.8rem",
                            margin: 0,
                            textAlign: "center",
                          }}
                        >
                          💡 Click "Download PDF" to get your complete
                          diagnostic report with AI analysis
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default History;
