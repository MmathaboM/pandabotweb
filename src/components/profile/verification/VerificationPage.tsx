
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
  const [processing, setProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Manual entry fields
  const [idNumber, setIdNumber] = useState("");
  const [confirmIdNumber, setConfirmIdNumber] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "scanner-container";

  // Load user profile and start scanner
  useEffect(() => {
    const init = async () => {
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
    init();

    // Cleanup scanner on unmount
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
          // ignore continuous scan errors
        },
      );
    } catch (err) {
      console.error("Camera error:", err);
      setScanError(
        "Camera access denied. Please allow camera permissions or enter the ID manually.",
      );
      setScanning(false);
      setShowManual(true);
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
    if (processing) return;

    // Stop scanner immediately
    await stopScanner();
    setProcessing(true);

    try {
      console.log("Raw barcode data:", decodedText);

      // Parse using same logic as mobile
      const parsedData = parseSAIDBarcode(decodedText);
      console.log("Parsed data:", parsedData);

      if (!parsedData.idNumber || parsedData.idNumber.length !== 13) {
        // Show alert with option to enter manually
        const confirmManual = window.confirm(
          "Could not extract a valid 13-digit ID number from the barcode.\n\nDo you want to enter the ID manually?",
        );
        if (confirmManual) {
          setShowManual(true);
          setIdNumber(parsedData.idNumber || "");
        } else {
          // Resume scanning
          setProcessing(false);
          startScanner();
        }
        return;
      }

      // Show confirmation dialog with extracted info (similar to mobile Alert)
      const confirmVerify = window.confirm(
        `ID Scanned Successfully\n\n` +
          `ID Number: ${parsedData.idNumber}\n` +
          `Name on ID: ${parsedData.fullNames}\n` +
          `Surname: ${parsedData.surname}\n` +
          `DOB: ${parsedData.date_of_birth}\n` +
          `Gender: ${parsedData.gender}\n\n` +
          `Would you like to verify this ID?`,
      );

      if (!confirmVerify) {
        setProcessing(false);
        startScanner();
        return;
      }

      // Proceed with verification
      await handleVerifyNow(parsedData);
    } catch (error) {
      console.error("Scan error:", error);
      alert("Failed to process barcode. Please try again.");
      setProcessing(false);
      startScanner();
    }
  };

  // ─── Parse SA ID barcode (PDF417) – exactly as mobile ──────────────────
  const parseSAIDBarcode = (data: string) => {
    let idNumber = "";
    let surname = "";
    let fullNames = "";
    let dateOfBirth = "";
    let gender = "";
    let citizenship = "";

    // Extract 13-digit ID number
    const idMatch = data.match(/\d{13}/);
    if (idMatch) {
      idNumber = idMatch[0];
    }

    const parts = data.split("|");
    if (parts.length >= 6) {
      surname = parts[0].trim();
      fullNames = parts[1].trim();
      gender = parts[2].trim();
      dateOfBirth = parts[5].trim();
      citizenship = parts[7]?.trim() || "";
    } else {
      const simpleParts = data.split(/[|,;]/);
      if (simpleParts.length >= 2) {
        surname = simpleParts[0].trim();
        fullNames = simpleParts[1].trim();
      }
    }

    // Extract first name from full names
    const nameParts = fullNames.split(/\s+/);
    const firstName = nameParts[0] || "";
    const middleNames = nameParts.slice(1).join(" ") || "";

    return {
      idNumber,
      surname,
      fullNames,
      first_name: firstName,
      middle_names: middleNames,
      last_name: surname,
      date_of_birth: dateOfBirth,
      gender:
        gender === "M"
          ? "male"
          : gender === "F"
            ? "female"
            : gender.toLowerCase(),
      citizenship,
    };
  };

  // ─── Compare with profile (same logic as mobile) ──────────────────────
  const normalizeString = (str: string): string => {
    return str.toLowerCase().trim().replace(/\s+/g, " ");
  };

  const nameMatchesAny = (
    profileName: string,
    idFullNames: string,
  ): boolean => {
    const normalizedProfile = normalizeString(profileName);
    const normalizedIdNames = normalizeString(idFullNames);
    const idNameParts = normalizedIdNames.split(/\s+/);
    return idNameParts.some(
      (part) =>
        part === normalizedProfile ||
        normalizedProfile.includes(part) ||
        part.includes(normalizedProfile),
    );
  };

  const datesMatch = (profileDate: string, idDate: string): boolean => {
    if (!profileDate || !idDate) return false;
    const profileDateObj = new Date(profileDate);
    const idDateParts = idDate.split(/\s+/);
    if (idDateParts.length === 3) {
      const months: { [key: string]: number } = {
        JAN: 0,
        FEB: 1,
        MAR: 2,
        APR: 3,
        MAY: 4,
        JUN: 5,
        JUL: 6,
        AUG: 7,
        SEP: 8,
        OCT: 9,
        NOV: 10,
        DEC: 11,
      };
      const day = parseInt(idDateParts[0]);
      const month = months[idDateParts[1].toUpperCase()];
      const year = parseInt(idDateParts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        const idDateObj = new Date(year, month, day);
        return profileDateObj.toDateString() === idDateObj.toDateString();
      }
    }
    return false;
  };

  const compareWithProfile = (scannedData: any) => {
    const mismatches = [];
    let hasMatch = false;

    if (userProfile?.first_name && scannedData.fullNames) {
      const firstNameMatch = nameMatchesAny(
        userProfile.first_name,
        scannedData.fullNames,
      );
      if (firstNameMatch) {
        hasMatch = true;
      } else {
        mismatches.push(
          `Name: Profile has "${userProfile.first_name}" but not found on ID card`,
        );
      }
    }

    if (userProfile?.last_name && scannedData.surname) {
      const lastNameMatch =
        normalizeString(userProfile.last_name) ===
        normalizeString(scannedData.surname);
      if (lastNameMatch) {
        hasMatch = true;
      } else {
        mismatches.push(
          `Surname: Profile has "${userProfile.last_name}", ID shows "${scannedData.surname}"`,
        );
      }
    }

    if (userProfile?.demographics?.date_of_birth && scannedData.date_of_birth) {
      const dobMatch = datesMatch(
        userProfile.demographics.date_of_birth,
        scannedData.date_of_birth,
      );
      if (!dobMatch) {
        mismatches.push(
          `Date of birth: Profile shows ${userProfile.demographics.date_of_birth}, ID shows ${scannedData.date_of_birth}`,
        );
      } else {
        hasMatch = true;
      }
    }

    if (userProfile?.demographics?.gender_id && scannedData.gender) {
      const genderMapping: { [key: string]: number } = { male: 1, female: 2 };
      const expectedGenderId = genderMapping[scannedData.gender.toLowerCase()];
      if (userProfile.demographics.gender_id !== expectedGenderId) {
        mismatches.push(
          `Gender: Profile shows ID ${userProfile.demographics.gender_id}, ID shows ${scannedData.gender}`,
        );
      } else {
        hasMatch = true;
      }
    }

    return {
      hasMatch,
      mismatches,
      isVerified: mismatches.length === 0,
    };
  };

  // ─── Verification submission ──────────────────────────────────────────
  const handleVerifyNow = async (scannedData: any) => {
    setProcessing(true);
    try {
      // 1. Validate ID number
      const validateRes = await api.post("/v1/auth/id/validate", {
        sa_id_number: scannedData.idNumber,
      });
      if (!validateRes.data.success) {
        alert(validateRes.data.message || "The ID number is invalid.");
        setProcessing(false);
        startScanner();
        return;
      }

      // 2. Compare with profile
      const comparison = compareWithProfile(scannedData);

      if (!comparison.isVerified && comparison.mismatches.length > 0) {
        const confirmContinue = window.confirm(
          `The following information differs from your profile:\n\n${comparison.mismatches.join(
            "\n",
          )}\n\nDo you want to continue with verification?`,
        );
        if (!confirmContinue) {
          setProcessing(false);
          startScanner();
          return;
        }
      }

      // 3. Submit verification
      await submitVerification(scannedData.idNumber);
    } catch (error: any) {
      console.error("Validation error:", error);
      alert(
        error?.response?.data?.message ||
          "Failed to validate ID. Please try again.",
      );
      setProcessing(false);
      startScanner();
    }
  };

  const submitVerification = async (idNumber: string) => {
    try {
      const response = await api.post("/v1/auth/id/verify", {
        sa_id_number: idNumber,
        confirm_id_number: idNumber,
      });

      if (response.data.success) {
        alert(
          "Verification Successful! 🎉\n\nYour ID has been verified successfully. You now have a higher trust score and priority application processing.",
        );
        onBack(); // return to completion hub
      } else {
        alert(
          response.data.message || "Unable to verify ID. Please try again.",
        );
        setProcessing(false);
        startScanner();
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      alert(
        error?.response?.data?.message ||
          "Failed to verify ID. Please try again.",
      );
      setProcessing(false);
      startScanner();
    }
  };

  // ─── Manual entry fallback ──────────────────────────────────────────────
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

    setProcessing(true);
    try {
      const validateRes = await api.post("/v1/auth/id/validate", {
        sa_id_number: trimmed,
      });
      if (!validateRes.data.success) {
        alert(validateRes.data.message || "Invalid ID number");
        setProcessing(false);
        return;
      }
      const extracted = validateRes.data.extracted_info;
      // Build a scannedData-like object from extracted info
      const scannedData = {
        idNumber: trimmed,
        fullNames: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`,
        surname: userProfile?.last_name || "",
        date_of_birth: extracted.date_of_birth,
        gender: extracted.gender,
      };
      // Compare and proceed similarly
      const comparison = compareWithProfile(scannedData);
      if (!comparison.isVerified && comparison.mismatches.length > 0) {
        const confirmContinue = window.confirm(
          `The following information differs from your profile:\n\n${comparison.mismatches.join(
            "\n",
          )}\n\nDo you want to continue with verification?`,
        );
        if (!confirmContinue) {
          setProcessing(false);
          return;
        }
      }
      await submitVerification(trimmed);
    } catch (error: any) {
      alert(error?.response?.data?.message || "An error occurred.");
      setProcessing(false);
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
    <div className="pc-root" style={{ overflow: "hidden", background: "#000" }}>
      {/* Header */}
      <div
        className="pc-header"
        style={{
          background: "transparent",
          position: "absolute",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          className="pc-header__back"
          onClick={onBack}
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <X size={20} color="#fff" />
        </button>
        <h1 className="pc-header__title" style={{ color: "#fff" }}>
          Scan ID Barcode
        </h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Camera view */}
      <div style={{ flex: 1, position: "relative" }}>
        <div
          id={scannerContainerId}
          style={{ width: "100%", height: "100%" }}
        />

        {/* Overlay with scan area */}
        <div className="pc-scan-overlay">
          <div className="pc-scan-area">
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
            <p className="pc-scan-text">
              Position the barcode on the back of your ID inside the frame
            </p>
          </div>
        </div>

        {/* Processing overlay */}
        {processing && (
          <div className="pc-processing-overlay">
            <RefreshCw
              size={40}
              className="pc-spin"
              style={{ color: "#fff" }}
            />
            <p style={{ color: "#fff", marginTop: 16, fontSize: 16 }}>
              Verifying your ID...
            </p>
          </div>
        )}
      </div>

      {/* Manual entry button at bottom */}
      <button
        className="pc-manual-entry-btn"
        onClick={() => setShowManual(true)}
      >
        Enter ID Manually
      </button>

      {/* Manual entry modal */}
      {showManual && !processing && (
        <div className="pc-manual-modal">
          <div className="pc-manual-card">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
              Enter ID Manually
            </h3>
            <div className="pc-input-group">
              <label>SA ID Number</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="13-digit SA ID number"
                maxLength={13}
              />
            </div>
            <div className="pc-input-group">
              <label>Confirm ID Number</label>
              <input
                type="text"
                value={confirmIdNumber}
                onChange={(e) => setConfirmIdNumber(e.target.value)}
                placeholder="Confirm ID number"
                maxLength={13}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                className="pc-btn pc-btn-primary"
                onClick={handleManualVerify}
              >
                Verify
              </button>
              <button
                className="pc-btn pc-btn-secondary"
                onClick={() => {
                  setShowManual(false);
                  startScanner();
                }}
              >
                Back to Scan
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pc-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background: #000;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .pc-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
        }
        .pc-header__back {
          background: rgba(0,0,0,0.5);
          border: none;
          width: 40px; height: 40px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .pc-header__title {
          flex: 1;
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          text-align: center;
        }

        .pc-scan-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .pc-scan-area {
          width: 80%;
          max-width: 320px;
          aspect-ratio: 1 / 1;
          border: 2px solid #fff;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.3);
          padding: 20px;
        }
        .pc-scan-text {
          color: #fff;
          font-size: 14px;
          text-align: center;
          margin-top: 16px;
          font-weight: 400;
          line-height: 1.4;
        }

        .pc-processing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 20;
        }

        .pc-manual-entry-btn {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          padding: 12px 24px;
          border-radius: 30px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          z-index: 10;
          backdrop-filter: blur(4px);
        }
        .pc-manual-entry-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .pc-manual-modal {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 30;
        }
        .pc-manual-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          width: 90%;
          max-width: 400px;
        }
        .pc-input-group {
          margin-bottom: 12px;
        }
        .pc-input-group label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
          color: #1a1a2e;
        }
        .pc-input-group input {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
        }
        .pc-input-group input:focus {
          border-color: #fb8500;
        }
        .pc-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          flex: 1;
        }
        .pc-btn-primary {
          background: #fb8500;
          color: #fff;
        }
        .pc-btn-primary:hover {
          background: #e07a00;
        }
        .pc-btn-secondary {
          background: #e5e7eb;
          color: #1a1a2e;
        }
        .pc-btn-secondary:hover {
          background: #d1d5db;
        }
        @keyframes pc-rotate {
          to { transform: rotate(360deg); }
        }
        .pc-spin {
          animation: pc-rotate 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
};
