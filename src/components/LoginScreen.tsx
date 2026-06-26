import React, { useState, useCallback } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../services/api";
import logo from "../assets/images/logo.png";

interface Props {
  onLogin: () => void;
  onGoToSignUp: () => void;
  onForgotPassword?: () => void; // ✅ added
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase().trim());
};

const LoginScreen: React.FC<Props> = ({
  onLogin,
  onGoToSignUp,
  onForgotPassword, // ✅ destructure
}) => {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setEmail(text);
      if (text.length > 3 && !validateEmail(text)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError(null);
      }
    },
    [],
  );

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      setError("Please enter a valid email address (e.g., name@example.com).");
      return;
    }
    setError("");
    try {
      await login({ email, password });
      onLogin();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  return (
    <div style={styles.root}>
      {/* Background gradient overlay */}
      <div style={styles.bgOverlay} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src={logo} alt="PandaBot" style={styles.logo} />
        </div>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome Back!</h1>
          <p style={styles.subtitle}>Sign in to your Panda Bot account</p>
        </div>

        {/* Error banner */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Form */}
        <div style={styles.form}>
          {/* Email */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>
                <Mail size={18} color="rgba(0,0,0,0.3)" />
              </span>
              <input
                type="email"
                placeholder="name@pandabot.co.za"
                value={email}
                onChange={handleEmailChange}
                style={styles.input}
                disabled={isLoading}
                autoCapitalize="none"
              />
            </div>
            {emailError && <p style={styles.fieldError}>{emailError}</p>}
          </div>

          {/* Password */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>
                <Lock size={18} color="rgba(0,0,0,0.3)" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={{ ...styles.input, paddingRight: 44 }}
                disabled={isLoading}
              />
              <button
                onClick={() => setShowPassword((s) => !s)}
                style={styles.eyeBtn}
                tabIndex={-1}
                type="button"
              >
                {showPassword ? (
                  <Eye size={18} color="rgba(0,0,0,0.3)" />
                ) : (
                  <EyeOff size={18} color="rgba(0,0,0,0.3)" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <button
              style={styles.forgotBtn}
              type="button"
              onClick={onForgotPassword} // ✅ now uses the prop
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              ...styles.signInBtn,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            type="button"
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </button>

          {/* Footer */}
          <p style={styles.footerText}>
            Don't have an account?{" "}
            <button onClick={onGoToSignUp} style={styles.linkBtn} type="button">
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */

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
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 32,
  },
  logo: {
    height: 110,
    width: "auto",
    objectFit: "contain",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: "#111111",
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: 400,
    color: "rgba(0,0,0,0.45)",
    margin: 0,
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  fieldWrap: {
    marginBottom: 18,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(0,0,0,0.5)",
    marginBottom: 8,
    letterSpacing: "0.02em",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "14px 14px 14px 42px",
    background: "#f7f8fa",
    border: "1px solid #e8eaed",
    borderRadius: 12,
    fontSize: 15,
    color: "#111111",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  } as React.CSSProperties,
  eyeBtn: {
    position: "absolute",
    right: 12,
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: 4,
  },
  fieldError: {
    margin: "6px 0 0",
    fontSize: 12,
    color: "#f87171",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#fb8500",
    fontSize: 13,
    fontWeight: 600,
    padding: 0,
  },
  signInBtn: {
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
    transition: "opacity 0.15s, transform 0.1s",
    marginBottom: 24,
    marginTop: 8,
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    color: "rgba(0,0,0,0.45)",
    margin: 0,
  },
  linkBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#fb8500",
    fontSize: 14,
    fontWeight: 700,
    padding: 0,
  },
};

export default LoginScreen;
