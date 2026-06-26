import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import { authService } from "../services/authService";
import logo from "../assets/images/logo.png";

const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.resetPassword({
        email,
        token,
        password,
        password_confirmation: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (error && !token) {
    return (
      <div style={styles.root}>
        <div style={styles.container}>
          <div style={styles.errorBox}>{error}</div>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            <ArrowLeft size={20} /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.bgOverlay} />
      <div style={styles.container}>
        <div style={styles.logoWrap}>
          <img src={logo} alt="PandaBot" style={styles.logo} />
        </div>

        <h1 style={styles.title}>Set New Password</h1>
        <p style={styles.subtitle}>
          Choose a strong password for your account.
        </p>

        {success ? (
          <div style={styles.successBox}>
            <p style={styles.successText}>
              Your password has been reset successfully! Redirecting to login…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>
                  <Mail size={18} color="rgba(0,0,0,0.3)" />
                </span>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{ ...styles.input, opacity: 0.6 }}
                />
              </div>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>
                  <Lock size={18} color="rgba(0,0,0,0.3)" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>
                  <Lock size={18} color="rgba(0,0,0,0.3)" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token || !email}
              style={{
                ...styles.submitBtn,
                opacity: loading || !token || !email ? 0.7 : 1,
                cursor: loading || !token || !email ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Styles (reuse from ForgotPasswordScreen) – I'll include a full set.
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(251,133,0,0.08) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 420,
    padding: "40px 28px 36px",
    boxSizing: "border-box",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    marginBottom: 24,
    color: "#111",
    fontSize: 14,
  },
  logoWrap: { display: "flex", justifyContent: "center", marginBottom: 32 },
  logo: { height: 90, width: "auto", objectFit: "contain" },
  title: { fontSize: 28, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.5px" },
  subtitle: { fontSize: 14, color: "rgba(0,0,0,0.5)", margin: "0 0 32px", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 0 },
  fieldWrap: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.5)", marginBottom: 8, letterSpacing: "0.02em" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: 14, display: "flex", alignItems: "center", pointerEvents: "none" },
  input: {
    width: "100%",
    padding: "14px 14px 14px 42px",
    background: "#f7f8fa",
    border: "1px solid #e8eaed",
    borderRadius: 12,
    fontSize: 15,
    color: "#111",
    outline: "none",
    boxSizing: "border-box",
  } as React.CSSProperties,
  submitBtn: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg, #fb8500 0%, #e85d04 100%)",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.02em",
    boxShadow: "0 4px 24px rgba(251,133,0,0.35)",
    marginTop: 8,
  },
  errorBox: {
    background: "rgba(220,38,38,0.15)",
    border: "1px solid rgba(220,38,38,0.4)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#f87171",
    marginBottom: 16,
  },
  successBox: { textAlign: "center", padding: "20px 0" },
  successText: { fontSize: 15, color: "#16a34a", marginBottom: 20, lineHeight: 1.6 },
};

export default ResetPasswordScreen;