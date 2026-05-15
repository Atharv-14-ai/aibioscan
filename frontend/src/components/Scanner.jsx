import { useState, useRef, useEffect } from "react";
import API from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import axios from "axios";
import {
  UploadCloud,
  FileAudio,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Activity,
  Stethoscope,
  User,
  Building2,
  Star,
  Phone,
  ScanEye,
  Info,
  ClipboardList,
  Mic,
  Square,
} from "lucide-react";

const AVAILABLE_SYMPTOMS = [
  "Fever",
  "Chills",
  "Dry/Persistent Cough",
  "Cough with Phlegm",
  "Shortness of Breath",
  "Chest Tightness/Pain",
  "Wheezing",
  "Night Sweats",
  "Fatigue",
  "Excess Mucus",
];

function Scanner({ user }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  // Audio Recording State
  const [isRecordMode, setIsRecordMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom],
    );
  };

  const clearAllSymptoms = () => {
    setSelectedSymptoms([]);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  };

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioFile = new File([audioBlob], "live_recording.wav", {
          type: "audio/wav",
          lastModified: Date.now(),
        });
        setFile(audioFile);
        setResult(null);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Please allow microphone access to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("symptoms", JSON.stringify(selectedSymptoms));
    if (user) formData.append("user_id", user.id);

    try {
      const response = await API.post("/api/predict", formData);
      setResult(response.data);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2dd4bf", "#38bdf8", "#0d9488"],
      });
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.detail ||
          "Failed to process audio or network error.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card"
      style={{ padding: "clamp(1rem, 4vw, 2rem)" }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: "clamp(1.5rem, 5vw, 2rem)",
        }}
      >
        <h2
          className="text-gradient"
          style={{
            fontSize: "clamp(1.5rem, 5vw, 2rem)",
            marginBottom: "0.5rem",
          }}
        >
          Start Diagnosis
        </h2>
        <p
          style={{ color: "#94a3b8", fontSize: "clamp(0.85rem, 3vw, 0.95rem)" }}
        >
          Provide clinical context and upload or record patient respiratory
          audio
        </p>
      </div>

      {/* STEP 1: CLINICAL CONTEXT */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.4)",
          padding: "clamp(1rem, 4vw, 1.5rem)",
          borderRadius: "16px",
          border: "1px solid rgba(125, 211, 252, 0.15)",
          marginBottom: "clamp(1.5rem, 5vw, 2rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ClipboardList size={20} color="#38bdf8" />
            <h3
              style={{
                margin: 0,
                color: "#f8fafc",
                fontSize: "clamp(1rem, 3.5vw, 1.1rem)",
              }}
            >
              Step 1: Clinical Context
            </h3>
          </div>
          {selectedSymptoms.length > 0 && (
            <button
              onClick={clearAllSymptoms}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#fca5a5",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "0.25rem 0.75rem",
                borderRadius: "8px",
                fontSize: "clamp(0.7rem, 2.5vw, 0.75rem)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Clear all ({selectedSymptoms.length})
            </button>
          )}
        </div>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "clamp(0.85rem, 3vw, 0.9rem)",
            marginBottom: "1rem",
          }}
        >
          Select any symptoms the patient is currently experiencing (Optional
          but improves AI accuracy).
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {AVAILABLE_SYMPTOMS.map((sym) => {
            const isActive = selectedSymptoms.includes(sym);
            return (
              <button
                key={sym}
                onClick={() => toggleSymptom(sym)}
                style={{
                  background: isActive
                    ? "rgba(56, 189, 248, 0.15)"
                    : "rgba(30, 41, 59, 0.6)",
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  border: `1px solid ${isActive ? "rgba(56, 189, 248, 0.4)" : "rgba(148, 163, 184, 0.2)"}`,
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  fontSize: "clamp(0.8rem, 2.5vw, 0.9rem)",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {isActive && <span style={{ marginRight: "6px" }}>✓</span>}{" "}
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: AUDIO ACQUISITION */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          marginTop: "1rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FileAudio size={20} color="#38bdf8" />
          <h3
            style={{
              margin: 0,
              color: "#f8fafc",
              fontSize: "clamp(1rem, 3.5vw, 1.1rem)",
            }}
          >
            Step 2: Respiratory Audio
          </h3>
        </div>

        {/* Mode Toggle */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            background: "rgba(30, 41, 59, 0.6)",
            padding: "0.25rem",
            borderRadius: "12px",
          }}
        >
          <button
            onClick={() => {
              setIsRecordMode(false);
              setFile(null);
              setResult(null);
            }}
            style={{
              padding: "0.5rem clamp(0.75rem, 2.5vw, 1rem)",
              borderRadius: "8px",
              fontSize: "clamp(0.8rem, 2.5vw, 0.85rem)",
              fontWeight: "500",
              cursor: "pointer",
              border: "none",
              background: !isRecordMode ? "#38bdf8" : "transparent",
              color: !isRecordMode ? "#0f172a" : "#94a3b8",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <UploadCloud size={18} /> Upload
          </button>
          <button
            onClick={() => {
              setIsRecordMode(true);
              setFile(null);
              setResult(null);
            }}
            style={{
              padding: "0.5rem clamp(0.75rem, 2.5vw, 1rem)",
              borderRadius: "8px",
              fontSize: "clamp(0.8rem, 2.5vw, 0.85rem)",
              fontWeight: "500",
              cursor: "pointer",
              border: "none",
              background: isRecordMode ? "#38bdf8" : "transparent",
              color: isRecordMode ? "#0f172a" : "#94a3b8",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Mic size={16} /> Record Live
          </button>
        </div>
      </div>

      {/* CONDITIONAL UI: RECORD vs UPLOAD */}
      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file-ready"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="upload-zone active"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "default",
              borderColor: "#10b981",
              padding: "clamp(2rem, 8vw, 4rem) 1rem",
            }}
          >
            <FileAudio size={48} color="#10b981" />
            <h3
              style={{
                marginTop: "1rem",
                fontSize: "clamp(1rem, 4vw, 1.2rem)",
                color: "#f8fafc",
                textAlign: "center",
                wordBreak: "break-all",
              }}
            >
              {file.name}
            </h3>
            <p
              style={{
                color: "#10b981",
                fontWeight: "500",
                marginTop: "0.5rem",
                fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
              }}
            >
              Audio captured and ready for analysis
            </p>
            <button
              onClick={() => setFile(null)}
              style={{
                marginTop: "1rem",
                background: "transparent",
                color: "#ef4444",
                border: "1px solid #ef4444",
                padding: "0.4rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "clamp(0.8rem, 3vw, 0.85rem)",
              }}
            >
              Clear & Retake
            </button>
          </motion.div>
        ) : isRecordMode ? (
          <motion.div
            key="record-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "clamp(2rem, 8vw, 3rem) 1rem",
              background: "rgba(15, 23, 42, 0.4)",
              borderRadius: "16px",
              border: "1px dashed rgba(56, 189, 248, 0.3)",
            }}
          >
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: "clamp(70px, 20vw, 80px)",
                height: "clamp(70px, 20vw, 80px)",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: isRecording ? "#ef4444" : "#38bdf8",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                animation: isRecording ? "pulse 1.5s infinite" : "none",
              }}
            >
              {isRecording ? (
                <Square size={28} fill="white" />
              ) : (
                <Mic size={32} />
              )}
            </button>
            <div
              style={{
                fontSize: "clamp(1.5rem, 6vw, 2rem)",
                fontWeight: "600",
                marginTop: "1rem",
                color: "#f8fafc",
                fontFamily: "monospace",
              }}
            >
              {formatTime(recordingTime)}
            </div>
            <p
              style={{
                color: "#94a3b8",
                marginTop: "1rem",
                fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                textAlign: "center",
              }}
            >
              {isRecording
                ? "Recording... Click stop when done."
                : "Click microphone to record respiratory sounds"}
            </p>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.7rem, 2.5vw, 0.8rem)",
                marginTop: "0.5rem",
                textAlign: "center",
              }}
            >
              Recommended: 5-10 seconds of breathing or cough sounds
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="upload-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`upload-zone ${isDragging ? "active" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              type="file"
              accept=".wav,.mp3,.flac,.ogg"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={(e) => {
                setFile(e.target.files[0]);
                setResult(null);
              }}
            />
            <UploadCloud
              size={48}
              color={isDragging ? "#38bdf8" : "#64748b"}
              style={{ transition: "color 0.3s" }}
            />
            <h3
              style={{
                marginTop: "1rem",
                color: "#f8fafc",
                fontSize: "clamp(1rem, 4vw, 1.2rem)",
              }}
            >
              {isDragging ? "Drop file here!" : "Drag & Drop Audio"}
            </h3>
            <p
              style={{
                color: "#94a3b8",
                marginTop: "0.5rem",
                fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
              }}
            >
              or click to browse computer
            </p>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.7rem, 2.5vw, 0.8rem)",
                marginTop: "0.5rem",
              }}
            >
              Supported formats: WAV, MP3, FLAC, OGG
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{ textAlign: "center", marginTop: "clamp(1.5rem, 5vw, 2.5rem)" }}
      >
        <button
          className="btn-premium"
          onClick={handleUpload}
          disabled={!file || loading}
          style={{ width: "min(100%, 300px)" }}
        >
          {loading ? (
            <div className="flex-center">
              <Loader2 className="spin" size={22} /> Analyzing...
            </div>
          ) : (
            "Generate AI Diagnosis"
          )}
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-center"
          style={{
            marginTop: "1.5rem",
            color: "#fca5a5",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "1rem",
            borderRadius: "8px",
            fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
            textAlign: "center",
          }}
        >
          <AlertCircle size={20} /> {error}
        </motion.div>
      )}

      {/* Animated Results Reveal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
            style={{
              marginTop: "2rem",
              borderTop: "1px solid rgba(56, 189, 248, 0.2)",
              paddingTop: "2rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              <CheckCircle2 color="#10b981" size={24} />
              <h2
                style={{
                  margin: 0,
                  color: "#f8fafc",
                  fontSize: "clamp(1.3rem, 5vw, 1.8rem)",
                }}
              >
                Diagnostic Report
              </h2>
            </div>

            {/* Symptom Boost Indicator */}
            {result.patient_context_used && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  background: "rgba(56, 189, 248, 0.1)",
                  borderRadius: "12px",
                  padding: "0.75rem 1rem",
                  marginBottom: "1.5rem",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <ClipboardList size={16} color="#38bdf8" />
                  <span
                    style={{
                      color: "#cbd5e1",
                      fontSize: "clamp(0.8rem, 3vw, 0.875rem)",
                    }}
                  >
                    Clinical context applied:
                    <strong style={{ color: "#38bdf8", marginLeft: "0.25rem" }}>
                      +{result.symptom_boost_percentage || 0}% confidence boost
                    </strong>
                  </span>
                </div>
              </motion.div>
            )}

            {/* Results Grid - Responsive */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div className="metric-box">
                <div className="metric-label">Predicted Condition</div>
                <div
                  className="text-gradient"
                  style={{
                    fontSize: "clamp(1.5rem, 6vw, 2.5rem)",
                    fontWeight: "800",
                    marginTop: "0.5rem",
                    wordBreak: "break-word",
                  }}
                >
                  {result.prediction}
                </div>
              </div>
              <div
                className="metric-box"
                style={{
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div className="metric-label">AI Confidence</div>
                <div
                  style={{
                    fontSize: "clamp(1.5rem, 6vw, 2.5rem)",
                    fontWeight: "800",
                    color: "#10b981",
                    marginTop: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <Activity size={clampIcon(24, 32)} />
                  {(result.confidence * 100).toFixed(1)}%
                </div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence * 100}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    height: "4px",
                    background: "#10b981",
                  }}
                />
              </div>
            </div>

            {/* GRAD-CAM HEATMAP SECTION - FIXED FOR RESPONSIVENESS */}
            {result.heatmap_url && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="xai-container"
                style={{
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                <div
                  className="xai-header"
                  style={{ flexWrap: "wrap", gap: "0.75rem" }}
                >
                  <div className="xai-title">
                    <ScanEye size={20} color="#38bdf8" />
                    AI Feature Activation Map
                  </div>
                  <span className="xai-badge">Verified Analysis</span>
                </div>

                <div
                  className="xai-image-wrapper"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "auto",
                    minHeight: "200px",
                    maxHeight: "clamp(200px, 40vw, 350px)",
                    background: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={result.heatmap_url}
                    alt="Grad-CAM Audio Analysis"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      maxWidth: "100%",
                      display: "block",
                    }}
                    onError={(e) => {
                      console.error("Heatmap failed to load");
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML =
                        '<p style="color: #94a3b8; padding: 2rem; text-align: center;">Heatmap visualization unavailable</p>';
                    }}
                  />
                  <div
                    className="xai-legend"
                    style={{
                      position: "absolute",
                      bottom: "0.5rem",
                      right: "0.5rem",
                      background: "rgba(11, 21, 33, 0.9)",
                      backdropFilter: "blur(4px)",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "clamp(0.65rem, 2.5vw, 0.75rem)",
                    }}
                  >
                    <span>Low</span>
                    <div
                      style={{
                        width: "clamp(40px, 15vw, 60px)",
                        height: "6px",
                        borderRadius: "3px",
                        background:
                          "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
                      }}
                    />
                    <span>High</span>
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      "clamp(0.75rem, 3vw, 1rem) clamp(1rem, 4vw, 1.5rem)",
                    background: "rgba(11, 21, 33, 0.4)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#94a3b8",
                      fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <Info
                      size={16}
                      style={{ flexShrink: 0, marginTop: "2px" }}
                      color="#38bdf8"
                    />
                    <span>
                      This Grad-CAM heatmap highlights the specific acoustic
                      frequencies and time intervals within the patient's
                      respiratory sample that most heavily influenced the neural
                      network's diagnostic decision.
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Clinical Insights */}
            {result.info && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="info-section"
              >
                <h3
                  style={{
                    color: "#f8fafc",
                    marginBottom: "1rem",
                    marginTop: "1.5rem",
                    fontSize: "clamp(1.1rem, 4vw, 1.3rem)",
                  }}
                >
                  Clinical Insights
                </h3>
                <p
                  style={{
                    fontSize: "clamp(0.9rem, 3.5vw, 1.1rem)",
                    color: "#cbd5e1",
                    lineHeight: "1.5",
                  }}
                >
                  {result.info.desc}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
                    gap: "1.5rem",
                    marginTop: "1.5rem",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color: "#94a3b8",
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                      }}
                    >
                      Indicators:
                    </strong>
                    <div className="pill-list">
                      {result.info.symptoms.map((sym, i) => (
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          key={i}
                          className="pill"
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#fca5a5",
                            borderColor: "rgba(239, 68, 68, 0.3)",
                            fontSize: "clamp(0.7rem, 2.5vw, 0.85rem)",
                          }}
                        >
                          {sym}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong
                      style={{
                        color: "#94a3b8",
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                      }}
                    >
                      Actions:
                    </strong>
                    <div className="pill-list">
                      {result.info.treatment.map((treat, i) => (
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          key={i}
                          className="pill"
                          style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#6ee7b7",
                            borderColor: "rgba(16, 185, 129, 0.3)",
                            fontSize: "clamp(0.7rem, 2.5vw, 0.85rem)",
                          }}
                        >
                          {treat}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Doctor Recommendations Section */}
            {result.recommended_doctors &&
              result.recommended_doctors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  style={{
                    marginTop: "2rem",
                    borderTop: "1px solid rgba(56, 189, 248, 0.2)",
                    paddingTop: "2rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <Stethoscope color="#38bdf8" size={24} />
                    <h3
                      style={{
                        margin: 0,
                        color: "#f8fafc",
                        fontSize: "clamp(1.1rem, 4vw, 1.3rem)",
                      }}
                    >
                      Recommended Specialists
                    </h3>
                  </div>
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "clamp(0.85rem, 3vw, 0.9rem)",
                      marginBottom: "1.5rem",
                    }}
                  >
                    Based on your diagnosis, we recommend consulting with one of
                    these verified pulmonologists.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                      gap: "1.5rem",
                    }}
                  >
                    {result.recommended_doctors.map((doc, idx) => (
                      <motion.div
                        key={doc.id}
                        className="doctor-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 + idx * 0.1 }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="doc-header">
                          <div className="doc-avatar">
                            <User size={24} />
                          </div>
                          <div>
                            <div
                              className="doc-name"
                              style={{
                                fontSize: "clamp(0.95rem, 3vw, 1.05rem)",
                              }}
                            >
                              {doc.name}
                            </div>
                            <div
                              className="doc-spec"
                              style={{
                                fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)",
                              }}
                            >
                              {doc.specialty}
                            </div>
                          </div>
                        </div>

                        <div className="doc-details">
                          <div
                            className="doc-detail-row"
                            style={{
                              fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)",
                            }}
                          >
                            <Building2 size={14} color="#94a3b8" />
                            {doc.hospital}
                          </div>
                          <div
                            className="doc-detail-row"
                            style={{
                              fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)",
                            }}
                          >
                            <Star size={14} color="#f59e0b" fill="#f59e0b" />
                            {doc.rating} Patient Rating
                          </div>
                        </div>

                        <button
                          className="btn-contact"
                          onClick={() =>
                            (window.location.href = `tel:${doc.phone}`)
                          }
                          style={{ minHeight: "44px" }}
                        >
                          <Phone size={16} /> Contact Clinic
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </motion.div>
  );
}

// Helper function for clamping icon sizes
function clampIcon(min, max) {
  if (typeof window === "undefined") return max;
  const screenWidth = window.innerWidth;
  if (screenWidth <= 480) return min;
  if (screenWidth >= 1024) return max;
  return min + (max - min) * ((screenWidth - 480) / (1024 - 480));
}

export default Scanner;
