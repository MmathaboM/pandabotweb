
import React, { useState, useEffect, useRef } from "react";
import { X, Shield, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import api from "../../../services/api";
import { profileService } from "../../../services/profile";
import { Html5Qrcode } from "html5-qrcode";

interface VerifyIDPageProps {
  onBack: () => void;
}

export const VerifyIDPage: React.FC<VerifyIDPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [confirmIdNumber, setConfirmIdNumber] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    dobMatch?: boolean;
    genderMatch?: boolean;
    extractedData?: any;
  } | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "scanner-container";

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        setUserProfile(profile);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
        // Start scanner after profile loads
        startScanner();
      }
    };
    loadProfile();
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear();
      }
    };
  }, []);

  // ─── Scanner logic ──────────────────────────────────────────────────────
  const startScanner = async () => {
    if (scannerRef.current) return;
    try {
      setScanning(true);
      setScanError(null);
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        (errorMessage) => {
          // Ignore continuous scan errors
        },
      );
    } catch (err) {
      console.error("Camera error:", err);
      setScanError(
        "Camera access denied. Please allow camera permissions or enter the ID manually.",
      );
      setScanning(false);
      setShowManualEntry(true); // fallback to manual input
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
    setScanning(false);
  };

  // ─── Scan success handler ──────────────────────────────────────────────
  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning immediately
    await stopScanner();

    // Validate format
    if (!/^\d{13}$/.test(decodedText)) {
      setScanError("Scanned barcode is not a valid SA ID number (13 digits).");
      setShowManualEntry(true);
      return;
    }

    setIdNumber(decodedText);
    setConfirmIdNumber(decodedText);
    setVerifying(true);

    try {
      // 1. Validate with backend
      const validateRes = await api.post("/v1/auth/id/validate", {
        sa_id_number: decodedText,
      });

      if (!validateRes.data.success) {
        setVerificationResult({
          success: false,
          message: validateRes.data.message || "Invalid ID number",
        });
        setVerifying(false);
        setShowManualEntry(true);
        return;
      }

      const extracted = validateRes.data.extracted_info;

      // 2. Compare with profile
      const comp = validateIdAgainstProfile(extracted);
      const mismatches = [];
      if (comp.dobMatch === false) mismatches.push("Date of Birth");
      if (comp.genderMatch === false) mismatches.push("Gender");

      // If mismatches, ask user to confirm continue
      if (mismatches.length > 0) {
        const confirmContinue = window.confirm(
          `The ID shows different ${mismatches.join(" and ")} than your profile. Continue anyway?`,
        );
        if (!confirmContinue) {
          setVerificationResult({
            success: false,
            message: "Verification cancelled due to mismatches.",
          });
          setVerifying(false);
          setShowManualEntry(true);
          return;
        }
      }

      // 3. Submit verification
      const verifyRes = await api.post("/v1/auth/id/verify", {
        sa_id_number: decodedText,
        confirm_id_number: decodedText,
      });

      if (verifyRes.data.success) {
        // Auto-fill missing profile data
        await autoFillProfile(extracted);

        let msg = "Your ID has been verified successfully!";
        if (comp.dobMatch === true)
          msg += "\n✓ Date of birth matches your profile";
        if (comp.genderMatch === true) msg += "\n✓ Gender matches your profile";

        setVerificationResult({
          success: true,
          message: msg,
          dobMatch: comp.dobMatch,
          genderMatch: comp.genderMatch,
          extractedData: extracted,
        });

        // Auto-close after short delay
        setTimeout(() => onBack(), 3000);
      } else {
        setVerificationResult({
          success: false,
          message: "Verification failed. Please try again.",
        });
        setShowManualEntry(true);
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message:
          err?.response?.data?.message ||
          "An error occurred. Please try again.",
      });
      setShowManualEntry(true);
    } finally {
      setVerifying(false);
    }
  };

  // ─── Helper functions ──────────────────────────────────────────────────
  const validateIdAgainstProfile = (extractedData: any) => {
    const results = {
      dobMatch: false,
      genderMatch: false,
      extractedData,
    };

    if (
      userProfile?.demographics?.date_of_birth &&
      extractedData.date_of_birth
    ) {
      const profileDOB = new Date(userProfile.demographics.date_of_birth);
      const extractedDOB = new Date(extractedData.date_of_birth);
      results.dobMatch =
        profileDOB.toDateString() === extractedDOB.toDateString();
    }

    if (userProfile?.demographics?.gender_id && extractedData.gender) {
      const extractedGenderId = extractedData.gender === "male" ? 1 : 2;
      results.genderMatch =
        userProfile.demographics.gender_id === extractedGenderId;
    }

    return results;
  };

  const autoFillProfile = async (extractedData: any) => {
    const updates: any = {};
    if (
      !userProfile?.demographics?.date_of_birth &&
      extractedData.date_of_birth
    ) {
      updates.date_of_birth = extractedData.date_of_birth;
    }
    if (!userProfile?.demographics?.gender_id && extractedData.gender) {
      updates.gender_id = extractedData.gender === "male" ? 1 : 2;
    }
    if (Object.keys(updates).length > 0) {
      try {
        await profileService.updateProfile(updates);
        const updated = await profileService.getProfile();
        setUserProfile(updated);
      } catch (err) {
        console.error("Auto-fill failed", err);
      }
    }
  };

  // ─── Manual entry fallback ─────────────────────────────────────────────
  const handleManualVerify = async () => {
    const trimmed = idNumber.trim();
    if (!trimmed || trimmed.length !== 13) {
      alert("Please enter a valid 13-digit SA ID number.");
      return;
    }
    if (trimmed !== confirmIdNumber.trim()) {
      alert("ID numbers do not match.");
      return;
    }
    setVerifying(true);
    try {
      const validateRes = await api.post("/v1/auth/id/validate", {
        sa_id_number: trimmed,
      });
      if (!validateRes.data.success) {
        alert(validateRes.data.message || "Invalid ID number");
        setVerifying(false);
        return;
      }
      const extracted = validateRes.data.extracted_info;
      const comp = validateIdAgainstProfile(extracted);
      const mismatches = [];
      if (comp.dobMatch === false) mismatches.push("Date of Birth");
      if (comp.genderMatch === false) mismatches.push("Gender");
      if (mismatches.length > 0) {
        if (
          !window.confirm(
            `The ID shows different ${mismatches.join(" and ")} than your profile. Continue anyway?`,
          )
        ) {
          setVerifying(false);
          return;
        }
      }
      const verifyRes = await api.post("/v1/auth/id/verify", {
        sa_id_number: trimmed,
        confirm_id_number: confirmIdNumber.trim(),
      });
      if (verifyRes.data.success) {
        await autoFillProfile(extracted);
        alert("Your ID has been verified successfully!");
        onBack();
      } else {
        alert("Verification failed. Please try again.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "An error occurred.");
    } finally {
      setVerifying(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="pc-root"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <RefreshCw size={32} className="pc-spin" />
        <span style={{ marginTop: 16, color: "#9ca3af" }}>
          Loading your profile…
        </span>
      </div>
    );
  }

  return (
    <div className="pc-root" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div className="pc-header">
        <button className="pc-header__back" onClick={onBack}>
          <X size={20} color="#fff" />
        </button>
        <h1 className="pc-header__title">Verify Your ID</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="pc-body" style={{ paddingTop: 16 }}>
        {!showManualEntry && !verificationResult && (
          <>
            <div className="pc-scanner-container">
              <div id={scannerContainerId} className="pc-scanner-view" />
              {scanning ? (
                <p className="pc-scanner-hint">
                  Position the barcode (PDF417) on the back of your ID inside
                  the frame.
                </p>
              ) : (
                <p className="pc-scanner-hint" style={{ color: "#dc2626" }}>
                  Camera not active. Please allow camera permissions or use
                  manual entry.
                </p>
              )}
              <button
                className="pc-retry-scan-btn"
                onClick={() => {
                  setShowManualEntry(false);
                  startScanner();
                }}
                style={{ marginTop: 12 }}
              >
                Retry Scan
              </button>
              <button
                className="pc-manual-link"
                onClick={() => setShowManualEntry(true)}
              >
                Enter ID manually instead
              </button>
            </div>
          </>
        )}

        {verificationResult && (
          <div className="pc-result-card">
            <div className="pc-result-icon">
              {verificationResult.success ? (
                <CheckCircle size={48} color="#16a34a" />
              ) : (
                <AlertCircle size={48} color="#dc2626" />
              )}
            </div>
            <h3 className="pc-result-title">
              {verificationResult.success
                ? "Verification Successful!"
                : "Verification Failed"}
            </h3>
            <p className="pc-result-message">{verificationResult.message}</p>
            {verificationResult.success && (
              <button
                className="pc-primary-btn"
                onClick={onBack}
                style={{ marginTop: 16 }}
              >
                Continue
              </button>
            )}
            {!verificationResult.success && (
              <button
                className="pc-primary-btn"
                onClick={() => {
                  setVerificationResult(null);
                  setShowManualEntry(true);
                  startScanner();
                }}
                style={{ marginTop: 16 }}
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {showManualEntry && !verificationResult && (
          <div className="pc-manual-section">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Enter ID Number Manually
            </h3>
            <div className="pc-input-card">
              <label className="pc-input-label">SA ID Number</label>
              <input
                className="pc-text-input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="13-digit SA ID number"
                inputMode="numeric"
                maxLength={13}
              />
              <hr className="pc-divider" />
              <label className="pc-input-label">Confirm ID Number</label>
              <input
                className="pc-text-input"
                value={confirmIdNumber}
                onChange={(e) => setConfirmIdNumber(e.target.value)}
                placeholder="Confirm ID number"
                inputMode="numeric"
                maxLength={13}
              />
            </div>
            <button
              className="pc-primary-btn"
              onClick={handleManualVerify}
              disabled={verifying}
            >
              {verifying ? (
                <RefreshCw size={18} className="pc-spin" />
              ) : (
                "Verify"
              )}
            </button>
            <button
              className="pc-scan-again-link"
              onClick={() => {
                setShowManualEntry(false);
                startScanner();
              }}
            >
              ← Back to Scanner
            </button>
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .pc-scanner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
        .pc-scanner-view {
          width: 100%;
          aspect-ratio: 1 / 1;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
        }
        .pc-scanner-hint {
          color: var(--pc-muted);
          font-size: 14px;
          text-align: center;
          margin: 12px 0 4px;
        }
        .pc-retry-scan-btn {
          background: var(--pc-primary);
          color: #fff;
          border: none;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .pc-retry-scan-btn:hover { opacity: 0.85; }
        .pc-manual-link {
          background: none;
          border: none;
          color: var(--pc-primary);
          font-size: 14px;
          text-decoration: underline;
          cursor: pointer;
          margin-top: 8px;
        }
        .pc-manual-section {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
        .pc-input-card {
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .pc-input-label {
          font-weight: 600;
          font-size: 14px;
          color: var(--pc-text);
          display: block;
          margin-bottom: 6px;
        }
        .pc-text-input {
          width: 100%;
          padding: 10px 0;
          font-size: 16px;
          border: none;
          border-bottom: 2px solid #e5e7eb;
          outline: none;
          transition: border-color 0.2s;
          background: transparent;
        }
        .pc-text-input:focus {
          border-bottom-color: var(--pc-primary);
        }
        .pc-divider {
          margin: 14px 0;
          border: none;
          border-top: 1px solid #f0f0f0;
        }
        .pc-primary-btn {
          background: var(--pc-primary);
          color: #fff;
          border: none;
          padding: 14px;
          border-radius: 14px;
          width: 100%;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .pc-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pc-primary-btn:hover:not(:disabled) { opacity: 0.9; }
        .pc-scan-again-link {
          background: none;
          border: none;
          color: var(--pc-primary);
          font-size: 14px;
          text-decoration: underline;
          cursor: pointer;
          display: block;
          margin: 12px auto 0;
        }
        .pc-result-card {
          text-align: center;
          padding: 24px 16px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          max-width: 400px;
          margin: 0 auto;
        }
        .pc-result-icon { margin-bottom: 12px; }
        .pc-result-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--pc-text);
          margin-bottom: 8px;
        }
        .pc-result-message {
          color: var(--pc-muted);
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-line;
        }
      `}</style>
    </div>
  );
};
