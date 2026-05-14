import { useState } from "react";
import API from "../services/api";
import { UserPlus, LogIn, AlertCircle } from "lucide-react";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await API.post("/api/login", {
          email: formData.email,
          password: formData.password,
        });
        onLogin(res.data.user);
      } else {
        const res = await API.post("/api/signup", formData);
        // Auto-login after signup
        onLogin({
          id: res.data.user_id,
          full_name: formData.full_name,
          email: formData.email,
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "400px", margin: "4rem auto" }}>
      <div className="flex-center" style={{ marginBottom: "1.5rem" }}>
        {isLogin ? (
          <LogIn size={32} color="#2563eb" />
        ) : (
          <UserPlus size={32} color="#2563eb" />
        )}
      </div>
      <h2
        style={{ textAlign: "center", marginBottom: "2rem", color: "#1e293b" }}
      >
        {isLogin ? "Welcome Back" : "Create Account"}
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            required
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            style={inputStyle}
          />
        )}
        <input
          type="email"
          placeholder="Email Address"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          style={inputStyle}
        />

        {error && (
          <div
            className="flex-center"
            style={{ color: "#ef4444", fontSize: "0.9rem" }}
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button
          type="submit"
          className="auth-btn"
          disabled={loading}
        >
          {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <p
        style={{
          textAlign: "center",
          marginTop: "1.5rem",
          color: "#64748b",
          fontSize: "0.9rem",
        }}
      >
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span
          style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Sign up here" : "Log in here"}
        </span>
      </p>
    </div>
  );
}

const inputStyle = {
  padding: "0.75rem",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "1rem",
  outline: "none",
};

export default Auth;
