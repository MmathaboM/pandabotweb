
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Shield,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Scan,
} from "lucide-react";
import api from "../../../services/api";
import { profileService } from "../../../services/profile";
import { Html5Qrcode } from "html5-qrcode";

interface VerifyIDPageProps {
  onBack: () => void;
}

export const VerifyIDPage: React.FC<VerifyIDPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [confirmIdNumber, setConfirmIdNumber] = useState("");
  const [scanning, setScanning] = useState(false); 
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "scanner-container";

  // User profile for comparison
  const [userProfile, setUserProfile] = useState<any>(null);
  const [comparison, setComparison] = useState<{
    dobMatch: boolean | null;
    genderMatch: boolean | null;
    extractedData: any;
  }>({ dobMatch: null, genderMatch: null, extractedData: null });

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        setUserProfile(profile);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
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
    try {
      setScanning(true);
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
        (decodedText) => {
          // Success: decodedText is the scanned ID number
          // Validate it's a 13-digit number (or let backend validate)
          if (/^\d{13}$/.test(decodedText)) {
            setIdNumber(decodedText);
            setConfirmIdNumber(decodedText);
            stopScanner(); // close scanner
          } else {
            // Optionally show a toast: "Invalid barcode format"
            console.warn(
              "Scanned data is not a valid SA ID number:",
              decodedText,
            );
          }
        },
        (errorMessage) => {
          // Ignore scan errors (they fire continuously)
        },
      );
    } catch (err) {
      console.error("Failed to start camera", err);
      alert(
        "Camera access denied. Please allow camera permissions or enter the ID manually.",
      );
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
    setScanning(false);
  };

  // ─── Verification flow (same as before) ────────────────────────────────
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
        return true;
      } catch (err) {
        console.error("Auto‑fill failed", err);
        return false;
      }
    }
    return true;
  };

  const handleVerify = async () => {
    const trimmed = idNumber.trim();
    if (!trimmed) {
      alert("Please enter your SA ID number");
      return;
    }
    if (trimmed.length !== 13 || !/^\d{13}$/.test(trimmed)) {
      alert("SA ID number must be 13 digits");
      return;
    }
    if (trimmed !== confirmIdNumber.trim()) {
      alert("ID numbers do not match");
      return;
    }

    setVerifying(true);
    try {
      const validateRes = await api.post("/v1/auth/id/validate", {
        sa_id_number: trimmed,
      });
      if (!validateRes.data.success) {
        alert(validateRes.data.message || "Invalid ID number format");
        setVerifying(false);
        return;
      }

      const extracted = validateRes.data.extracted_info;
      const comp = validateIdAgainstProfile(extracted);
      setComparison(comp);

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
        let msg = "Your ID has been verified successfully!";
        if (comp.dobMatch === true)
          msg += "\n✓ Date of birth matches your profile";
        if (comp.genderMatch === true) msg += "\n✓ Gender matches your profile";
        alert(msg);
        onBack();
      } else {
        alert("Verification failed. Please try again.");
      }
    } catch (err: any) {
      alert(
        err?.response?.data?.message || "An error occurred. Please try again.",
      );
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

      {/* Scanner overlay (full screen) */}
      {scanning && (
        <div className="pc-scanner-overlay">
          <div className="pc-scanner-header">
            <span>Scan ID Barcode</span>
            <button className="pc-scanner-close" onClick={stopScanner}>
              <X size={24} color="#fff" />
            </button>
          </div>
          <div id={scannerContainerId} className="pc-scanner-view" />
          <p className="pc-scanner-hint">
            Position the barcode (PDF417) on the back of your ID inside the
            frame.
          </p>
        </div>
      )}

      {/* Scrollable content (dimmed when scanning) */}
      <div
        className="pc-body"
        style={{ paddingTop: 24, opacity: scanning ? 0.3 : 1 }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Shield size={56} color="var(--pc-primary)" />
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginTop: 12,
              color: "var(--pc-text)",
            }}
          >
            Optional Verification
          </h2>
          <p
            style={{
              color: "var(--pc-muted)",
              maxWidth: 400,
              margin: "8px auto",
            }}
          >
            Verify your South African ID to increase trust and get priority
            applications.
          </p>
        </div>

        {/* Profile summary */}
        <div className="pc-profile-summary">
          <strong>Current Profile Info:</strong>
          <div style={{ marginTop: 8 }}>
            <div className="pc-summary-row">
              <span>Name:</span>
              <span>
                {userProfile?.first_name} {userProfile?.last_name}
              </span>
            </div>
            <div className="pc-summary-row">
              <span>DOB:</span>
              <span>
                {userProfile?.demographics?.date_of_birth || "Not set"}
              </span>
            </div>
            <div className="pc-summary-row">
              <span>Gender:</span>
              <span>{userProfile?.demographics?.gender || "Not set"}</span>
            </div>
          </div>
        </div>

        {/* Input card with scan button */}
        <div className="pc-input-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label className="pc-input-label">SA ID Number</label>
            <button
              className="pc-scan-btn"
              onClick={startScanner}
              disabled={scanning}
            >
              <Scan size={18} />
              Scan
            </button>
          </div>
          <input
            className="pc-text-input"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="Enter 13-digit SA ID number"
            inputMode="numeric"
            maxLength={13}
            disabled={scanning}
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
            disabled={scanning}
          />
        </div>

        {/* Preview comparison (if both fields filled and match) */}
        {idNumber.length === 13 &&
          idNumber === confirmIdNumber &&
          comparison.extractedData && (
            <div className="pc-preview-card">
              <strong style={{ display: "block", marginBottom: 8 }}>
                ID Extraction Preview:
              </strong>
              <div className="pc-preview-row">
                <span>DOB from ID:</span>
                <span className="pc-preview-value">
                  {comparison.extractedData.date_of_birth}
                  {comparison.dobMatch !== null &&
                    (comparison.dobMatch ? (
                      <CheckCircle
                        size={16}
                        color="#16a34a"
                        style={{ marginLeft: 6 }}
                      />
                    ) : (
                      <AlertCircle
                        size={16}
                        color="#dc2626"
                        style={{ marginLeft: 6 }}
                      />
                    ))}
                </span>
              </div>
              <div className="pc-preview-row">
                <span>Gender from ID:</span>
                <span className="pc-preview-value">
                  {comparison.extractedData.gender}
                  {comparison.genderMatch !== null &&
                    (comparison.genderMatch ? (
                      <CheckCircle
                        size={16}
                        color="#16a34a"
                        style={{ marginLeft: 6 }}
                      />
                    ) : (
                      <AlertCircle
                        size={16}
                        color="#dc2626"
                        style={{ marginLeft: 6 }}
                      />
                    ))}
                </span>
              </div>
            </div>
          )}

        <button
          className="pc-primary-btn"
          onClick={handleVerify}
          disabled={verifying || !idNumber || !confirmIdNumber || scanning}
        >
          {verifying ? (
            <RefreshCw size={18} className="pc-spin" />
          ) : (
            "Verify My ID"
          )}
        </button>

        <button className="pc-skip-btn" onClick={onBack}>
          Skip for now
        </button>

        <p className="pc-privacy-note">
          Your information is encrypted and secure. The ID will be validated
          using the official SA ID algorithm and compared with your profile
          data.
        </p>
      </div>

      {/* Additional styles for this page (including scanner) */}
      <style>{`
        .pc-profile-summary {
          background: rgba(251, 133, 0, 0.08);
          border-radius: 12px;
          padding: 16px;
          width: 100%;
          margin-bottom: 20px;
        }
        .pc-summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 14px;
        }
        .pc-summary-row span:first-child { color: var(--pc-muted); }
        .pc-summary-row span:last-child { font-weight: 500; color: var(--pc-text); }

        .pc-input-card {
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          width: 100%;
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

        .pc-preview-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 16px;
          width: 100%;
          margin-bottom: 20px;
        }
        .pc-preview-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 14px;
        }
        .pc-preview-row span:first-child { color: var(--pc-muted); }
        .pc-preview-value {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
          color: var(--pc-text);
        }

        .pc-scan-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--pc-primary);
          color: #fff;
          border: none;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .pc-scan-btn:hover { opacity: 0.85; }
        .pc-scan-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
        .pc-primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .pc-primary-btn:not(:disabled):hover {
          opacity: 0.9;
        }

        .pc-skip-btn {
          background: transparent;
          border: none;
          padding: 12px;
          width: 100%;
          color: var(--pc-muted);
          font-size: 14px;
          cursor: pointer;
          margin-top: 4px;
        }
        .pc-skip-btn:hover { text-decoration: underline; }

        .pc-privacy-note {
          font-size: 12px;
          color: var(--pc-muted);
          text-align: center;
          margin-top: 20px;
          line-height: 1.6;
        }

        /* ── Scanner overlay ── */
        .pc-scanner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.85);
          z-index: 2000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .pc-scanner-header {
          width: 100%;
          max-width: 500px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #fff;
          font-weight: 600;
          font-size: 18px;
          margin-bottom: 16px;
        }
        .pc-scanner-close {
          background: rgba(255,255,255,0.2);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .pc-scanner-close:hover { background: rgba(255,255,255,0.3); }
        .pc-scanner-view {
          width: 100%;
          max-width: 400px;
          aspect-ratio: 1 / 1;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
        }
        .pc-scanner-hint {
          color: #ccc;
          font-size: 14px;
          margin-top: 16px;
          text-align: center;
          max-width: 360px;
        }
      `}</style>
    </div>
  );
};
