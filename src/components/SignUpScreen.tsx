import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Briefcase,
  GraduationCap,
  AlertCircle,
  User,
  Calendar,
  Phone,
  Mail,
  Lock,
} from "lucide-react";
import { authService, RegisterPayload } from "../services/authService";

// ----- Color palette (matches your exported colors) -----
const COLORS = {
  primary: "#fb8500",
  primaryEnd: "#e85d04",
  secondary: "#1F2933",
  textPrimary: "#1F2933",
  textSecondary: "#616E7C",
  textMuted: "#9AA5B1",
  border: "#CBD2D9",
  borderLight: "#E4E7EB",
  surface: "#FFFFFF",
  background: "#F5F7FA",
  error: "#FF647C",
  warning: "#FFDE70",
  success: "#00CD50",
};

// ----- UI Components (web) -----
const GlassInput: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  icon?: React.ElementType;
  placeholder?: string;
  required?: boolean;
}> = ({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon,
  placeholder,
  required,
}) => (
  <div style={{ marginBottom: 16 }}>
    <label style={styles.fieldLabel}>
      {label} {required && "*"}
    </label>
    <div style={styles.inputWrapper}>
      {Icon && <Icon size={20} style={styles.inputIcon} />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        style={styles.glassInput}
      />
    </div>
  </div>
);

const VibrantButton: React.FC<{
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  isLoading?: boolean;
  style?: React.CSSProperties;
}> = ({ title, onPress, variant = "primary", disabled, isLoading, style }) => (
  <button
    onClick={onPress}
    disabled={disabled || isLoading}
    style={{
      ...styles.vibrantButton,
      ...(variant === "secondary" ? styles.secondaryButton : {}),
      ...(disabled || isLoading ? styles.disabledButton : {}),
      ...style,
    }}
  >
    {isLoading ? "Loading…" : title}
  </button>
);

const VibrantSelect: React.FC<{
  label: string;
  value: string;
  onSelect: (val: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
}> = ({ label, value, onSelect, options, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={styles.fieldLabel}>
      {label} {required && "*"}
    </label>
    <select
      value={value}
      onChange={(e) => onSelect(e.target.value)}
      style={styles.selectInput}
    >
      <option value="">Select {label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ----- Main Component -----
interface SignUpScreenProps {
  onGoToLogin: () => void; // called after success or when back button clicked on step 1
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ onGoToLogin }) => {
  // ---------- Step 1 – Personal ----------
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [phone, setPhone] = useState("");

  // ---------- Step 2 – Demographics ----------
  const [genderId, setGenderId] = useState("");
  const [equityGroup, setEquityGroup] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [disabilityDeclaration, setDisabilityDeclaration] = useState<
    "yes" | "no" | "prefer_not_to_say"
  >("no");
  const [disabilityTypeId, setDisabilityTypeId] = useState("");

  // ---------- Step 3 – Role ----------
  const [role, setRole] = useState<"youth" | "graduate">("youth");

  // ---------- Step 4 – Account ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ----- Password strength -----
  const passwordStrength = (pw: string): number => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  // ----- Validation per step -----
  const validateStep1 = (): boolean => {
    if (!firstName.trim()) {
      setError("First name is required");
      return false;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return false;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required");
      return false;
    }
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 13) {
      setError("You must be at least 13 years old");
      return false;
    }
    if (!phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!genderId) {
      setError("Please select your gender");
      return false;
    }
    if (!equityGroup) {
      setError("Population group is required for EE reporting");
      return false;
    }
    if (!provinceId) {
      setError("Please select your province");
      return false;
    }
    if (!disabilityDeclaration) {
      setError("Please indicate if you have a disability");
      return false;
    }
    if (disabilityDeclaration === "yes" && !disabilityTypeId) {
      setError("Please select your disability type");
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!role) {
      setError("Please select your role");
      return false;
    }
    return true;
  };

  const validateStep4 = (): boolean => {
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      setError("Valid email is required");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!termsAccepted) {
      setError("You must accept the Terms and Privacy Policy");
      return false;
    }
    return true;
  };

  // ----- Final submission -----
  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Build payload matching backend expectations
      const payload: RegisterPayload = {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password_confirmation: confirmPassword,

        // Personal
        mobile_number: phone,
        date_of_birth: dateOfBirth
          ? dateOfBirth.toISOString().split("T")[0]
          : undefined,
        sa_id_number: "", // not collected; send empty string

        // Demographics – convert to numbers
        gender_id: genderId ? parseInt(genderId, 10) : undefined,
        province_id: provinceId ? parseInt(provinceId, 10) : undefined,
        equity_group: equityGroup || undefined,
        disability_declaration: disabilityDeclaration || undefined,
        disability_type_id:
          disabilityDeclaration === "yes" && disabilityTypeId
            ? parseInt(disabilityTypeId, 10)
            : undefined,

        // Role
        role: role,
      };

      await authService.register(payload);

      // (optional) store extended profile draft
      localStorage.setItem(
        "profile_draft",
        JSON.stringify({
          date_of_birth: dateOfBirth
            ? dateOfBirth.toISOString().split("T")[0]
            : "",
          gender_id: genderId,
          equity_group: equityGroup,
          province_id: provinceId,
          disability_declaration: disabilityDeclaration,
          disability_type_id: disabilityTypeId,
          role,
        }),
      );

      // Success → go to login
      onGoToLogin();
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----- Navigation -----
  const nextStep = () => {
    let valid = false;
    if (step === 1) valid = validateStep1();
    if (step === 2) valid = validateStep2();
    if (step === 3) valid = validateStep3();
    if (step === 4) valid = validateStep4();

    if (!valid) return;
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    else handleSubmit();
  };

  const prevStep = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  };

  // ----- Helper Components -----
  const RoleCard: React.FC<{
    title: string;
    description: string;
    selected: boolean;
    onSelect: () => void;
    icon: React.ElementType;
  }> = ({ title, description, selected, onSelect, icon: Icon }) => (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 16,
        borderRadius: 16,
        border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
        backgroundColor: selected ? `${COLORS.primary}08` : COLORS.surface,
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: selected ? COLORS.primary : `${COLORS.primary}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={28} color={selected ? "#fff" : COLORS.primary} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: selected ? COLORS.primary : COLORS.textPrimary,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
          {description}
        </div>
      </div>
      {selected && <Check size={20} color={COLORS.primary} />}
    </div>
  );

  // ----- Render -----
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={step === 1 ? onGoToLogin : prevStep}
          style={styles.backButton}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.stepIndicator}>Step {step} of 4</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressTrack}>
        <div
          style={{ ...styles.progressFill, width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Form body */}
      <div style={styles.form}>
        {error && <div style={styles.errorBox}>{error}</div>}

        {step === 1 && (
          <>
            <h3 style={styles.sectionTitle}>Tell us about you</h3>
            <GlassInput
              label="First Name"
              value={firstName}
              onChange={setFirstName}
              icon={User}
              required
            />
            <GlassInput
              label="Last Name"
              value={lastName}
              onChange={setLastName}
              icon={User}
              required
            />
            <div style={{ marginBottom: 16 }}>
              <label style={styles.fieldLabel}>Date of Birth *</label>
              <div style={styles.inputWrapper}>
                <Calendar size={20} style={styles.inputIcon} />
                <input
                  type="date"
                  value={
                    dateOfBirth ? dateOfBirth.toISOString().split("T")[0] : ""
                  }
                  onChange={(e) =>
                    setDateOfBirth(
                      e.target.value ? new Date(e.target.value) : null,
                    )
                  }
                  style={styles.glassInput}
                />
              </div>
            </div>
            <GlassInput
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              icon={Phone}
              required
            />
            <VibrantButton title="Next Step" onPress={nextStep} />
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={styles.sectionTitle}>Required information</h3>
            <p style={styles.sectionSubtitle}>
              Required for BEE compliance and SETA reporting.
            </p>
            <VibrantSelect
              label="Gender"
              value={genderId}
              onSelect={setGenderId}
              options={[
                { label: "Male", value: "1" },
                { label: "Female", value: "2" },
                { label: "Non-binary", value: "3" },
                { label: "Prefer not to say", value: "4" },
              ]}
              required
            />
            <VibrantSelect
              label="Population Group"
              value={equityGroup}
              onSelect={setEquityGroup}
              options={[
                { label: "African", value: "african" },
                { label: "Coloured", value: "coloured" },
                { label: "Indian", value: "indian" },
                { label: "White", value: "white" },
                { label: "Asian", value: "asian" },
                { label: "Other", value: "other" },
                { label: "Prefer not to say", value: "prefer_not_to_say" },
              ]}
              required
            />
            <VibrantSelect
              label="Province"
              value={provinceId}
              onSelect={setProvinceId}
              options={[
                { label: "Eastern Cape", value: "1" },
                { label: "Free State", value: "2" },
                { label: "Gauteng", value: "3" },
                { label: "KwaZulu-Natal", value: "4" },
                { label: "Limpopo", value: "5" },
                { label: "Mpumalanga", value: "6" },
                { label: "Northern Cape", value: "7" },
                { label: "North West", value: "8" },
                { label: "Western Cape", value: "9" },
              ]}
              required
            />
            <VibrantSelect
              label="Do you have a disability?"
              value={disabilityDeclaration}
              onSelect={(val) => {
                setDisabilityDeclaration(val as any);
                if (val !== "yes") setDisabilityTypeId("");
              }}
              options={[
                { label: "No", value: "no" },
                { label: "Yes", value: "yes" },
                { label: "Prefer not to say", value: "prefer_not_to_say" },
              ]}
              required
            />
            {disabilityDeclaration === "yes" && (
              <VibrantSelect
                label="Disability Type"
                value={disabilityTypeId}
                onSelect={setDisabilityTypeId}
                options={[
                  { label: "Physical", value: "1" },
                  { label: "Visual", value: "2" },
                  { label: "Hearing", value: "3" },
                  { label: "Intellectual", value: "4" },
                  { label: "Learning", value: "5" },
                  { label: "Mental Health", value: "6" },
                  { label: "Other", value: "7" },
                ]}
                required
              />
            )}
            <div style={styles.buttonRow}>
              <VibrantButton
                title="Back"
                onPress={prevStep}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <VibrantButton
                title="Next Step"
                onPress={nextStep}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={styles.sectionTitle}>What are you looking for?</h3>
            <p style={styles.sectionSubtitle}>
              Select the type of opportunities that match your situation.
            </p>
            <RoleCard
              title="Youth / Job Seeker"
              description="Learnerships, internships, and job opportunities"
              selected={role === "youth"}
              onSelect={() => setRole("youth")}
              icon={Briefcase}
            />
            <RoleCard
              title="Graduate / Student"
              description="Bursaries and scholarship opportunities"
              selected={role === "graduate"}
              onSelect={() => setRole("graduate")}
              icon={GraduationCap}
            />
            {role === "graduate" && (
              <div style={styles.infoBox}>
                <AlertCircle size={20} color={COLORS.warning} />
                <span style={styles.infoText}>
                  As a graduate you'll primarily see bursary and scholarship
                  opportunities.
                </span>
              </div>
            )}
            <div style={styles.buttonRow}>
              <VibrantButton
                title="Back"
                onPress={prevStep}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <VibrantButton
                title="Next Step"
                onPress={nextStep}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={styles.sectionTitle}>Secure your account</h3>
            <GlassInput
              label="Email Address"
              value={email}
              onChange={setEmail}
              icon={Mail}
              type="email"
              required
            />
            <div style={{ marginBottom: 16 }}>
              <label style={styles.fieldLabel}>Password *</label>
              <div style={styles.inputWrapper}>
                <Lock size={20} style={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (at least 8 characters)"
                  style={styles.glassInput}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background:
                            passwordStrength(password) >= i
                              ? passwordStrength(password) <= 1
                                ? COLORS.error
                                : passwordStrength(password) <= 2
                                  ? COLORS.warning
                                  : COLORS.success
                              : COLORS.borderLight,
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: COLORS.textMuted }}>
                    {
                      ["", "Weak", "Fair", "Good", "Strong"][
                        passwordStrength(password)
                      ]
                    }{" "}
                    password
                  </p>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.fieldLabel}>Confirm Password *</label>
              <div style={styles.inputWrapper}>
                <Lock size={20} style={styles.inputIcon} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  style={styles.glassInput}
                />
                {confirmPassword && password === confirmPassword && (
                  <Check
                    size={18}
                    color={COLORS.success}
                    style={{ position: "absolute", right: 12 }}
                  />
                )}
              </div>
            </div>

            <div style={styles.termsRow}>
              <div
                onClick={() => setTermsAccepted(!termsAccepted)}
                style={{
                  ...styles.checkbox,
                  ...(termsAccepted ? styles.checkboxChecked : {}),
                }}
              >
                {termsAccepted && <Check size={16} color="#fff" />}
              </div>
              <span style={styles.termsText}>
                I agree to the{" "}
                <a href="/terms" style={styles.termsLink}>
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a href="/privacy" style={styles.termsLink}>
                  Privacy Policy
                </a>
              </span>
            </div>

            <div style={styles.buttonRow}>
              <VibrantButton
                title="Back"
                onPress={prevStep}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <VibrantButton
                title="Create Account"
                onPress={nextStep}
                disabled={!termsAccepted}
                isLoading={isLoading}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ----- Styles (using the orange palette) -----
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    background: COLORS.background,
    display: "flex",
    flexDirection: "column",
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 16px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: 24,
    paddingBottom: 8,
  },
  backButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: COLORS.textPrimary,
    display: "flex",
    padding: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.textPrimary,
    margin: 0,
    letterSpacing: -0.5,
  },
  stepIndicator: {
    fontSize: 14,
    color: COLORS.textSecondary,
    margin: 0,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    transition: "width 0.3s",
  },
  form: {
    flex: 1,
    paddingBottom: 32,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  fieldLabel: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 12,
    height: 56,
  },
  glassInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    fontSize: 16,
    color: COLORS.textPrimary,
    outline: "none",
    padding: "0 8px",
    height: "100%",
    fontFamily: "inherit",
  },
  inputIcon: {
    color: COLORS.textMuted,
    marginRight: 8,
    flexShrink: 0,
  },
  selectInput: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "rgba(255,255,255,0.8)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    outline: "none",
    fontFamily: "inherit",
    appearance: "auto",
    height: 56,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: COLORS.textMuted,
    display: "flex",
    padding: 0,
  },
  vibrantButton: {
    padding: "15px 24px",
    backgroundColor: COLORS.primary,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.15s",
    textAlign: "center",
    fontFamily: "inherit",
  },
  secondaryButton: {
    backgroundColor: COLORS.borderLight,
    color: COLORS.textPrimary,
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  buttonRow: {
    display: "flex",
    marginTop: 16,
  },
  errorBox: {
    background: `${COLORS.error}12`,
    border: `1px solid ${COLORS.error}`,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: COLORS.error,
    marginBottom: 12,
  },
  infoBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: `${COLORS.warning}25`,
    borderLeft: `4px solid ${COLORS.warning}`,
    padding: "12px 14px",
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 1.5,
  },
  termsRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
    cursor: "pointer",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 1.5,
  },
  termsLink: {
    color: COLORS.primary,
    textDecoration: "none",
    fontWeight: 600,
  },
};

export default SignUpScreen;
