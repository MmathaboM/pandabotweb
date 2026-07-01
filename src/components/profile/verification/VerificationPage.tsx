// VerifyIDPage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Shield,
  ShieldCheck,
  Zap,
  ZapOff,
} from "lucide-react";
import { authService } from "../../../services/authService";

interface VerifyIDPageProps {
  onBack: () => void;
}

interface ParsedID {
  idNumber: string;
  surname: string;
  fullNames: string;
  first_name: string;
  middle_names: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  citizenship: string;
}

type VerifyStep =
  | "loading"
  | "scanning"
  | "permission-denied"
  | "processing"
  | "manual"
  | "result";

export const VerifyIDPage: React.FC<VerifyIDPageProps> = ({ onBack }) => {
  const [step, setStep] = useState<VerifyStep>("loading");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [idNumber, setIdNumber] = useState("");
  const [confirmIdNumber, setConfirmIdNumber] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState(
    "Point camera at the barcode on the back of your ID",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ParsedID | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanLoopRef = useRef<number | null>(null);
  const userProfileRef = useRef<any>(null);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // ─── Start Camera ──────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log("✅ Camera started successfully");
      }

      // Check for torch support
      try {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        setTorchSupported(!!capabilities?.torch);
      } catch {
        setTorchSupported(false);
      }

      return stream;
    } catch (error: any) {
      console.error("Camera error:", error);
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Camera permission was denied. Allow camera access and try again.",
        );
        setStep("permission-denied");
      } else {
        setCameraError("Failed to access camera: " + error.message);
        setStep("permission-denied");
      }
      throw error;
    }
  }, []);

  // ─── Stop Camera ──────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    // Cancel scan loop
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
    console.log("🛑 Camera stopped");
  }, []);

  // ─── Toggle Torch ──────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }],
        } as any);
        setTorchOn(!torchOn);
      }
    } catch {
      alert("Flashlight isn't supported on this device/browser.");
    }
  }, [torchOn]);

  // ─── Parse SA ID Barcode ──────────────────────────────────────────────
  const parseSAIDBarcode = useCallback((data: string): ParsedID => {
    let idNumber = "";
    let surname = "";
    let fullNames = "";
    let dateOfBirth = "";
    let gender = "";
    let citizenship = "";

    const idMatch = data.match(/\d{13}/);
    if (idMatch) idNumber = idMatch[0];

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
  }, []);

  // ─── Profile Comparison ──────────────────────────────────────────────
  const normalizeString = useCallback(
    (str: string): string => str.toLowerCase().trim().replace(/\s+/g, " "),
    [],
  );

  const nameMatchesAny = useCallback(
    (profileName: string, idFullNames: string): boolean => {
      const norm = profileName.toLowerCase().trim().replace(/\s+/g, " ");
      const idParts = idFullNames
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .split(/\s+/);
      return idParts.some(
        (p) => p === norm || norm.includes(p) || p.includes(norm),
      );
    },
    [],
  );

  const datesMatch = useCallback(
    (profileDate: string, idDate: string): boolean => {
      if (!profileDate || !idDate) return false;
      const profileDateObj = new Date(profileDate);
      const idDateParts = idDate.split(/\s+/);
      if (idDateParts.length === 3) {
        const months: Record<string, number> = {
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
          return (
            profileDateObj.toDateString() ===
            new Date(year, month, day).toDateString()
          );
        }
      }
      return false;
    },
    [],
  );

  const compareWithProfile = useCallback(
    (parsed: ParsedID): { mismatches: string[] } => {
      const profile = userProfileRef.current;
      const mismatches: string[] = [];

      if (profile?.first_name && parsed.fullNames) {
        if (!nameMatchesAny(profile.first_name, parsed.fullNames)) {
          mismatches.push(
            `Name: profile has "${profile.first_name}" but it was not found on the ID`,
          );
        }
      }
      if (profile?.last_name && parsed.surname) {
        if (
          normalizeString(profile.last_name) !== normalizeString(parsed.surname)
        ) {
          mismatches.push(
            `Surname: profile has "${profile.last_name}", ID shows "${parsed.surname}"`,
          );
        }
      }
      if (profile?.demographics?.date_of_birth && parsed.date_of_birth) {
        if (
          !datesMatch(profile.demographics.date_of_birth, parsed.date_of_birth)
        ) {
          mismatches.push(
            `Date of birth: profile shows ${profile.demographics.date_of_birth}, ID shows ${parsed.date_of_birth}`,
          );
        }
      }
      if (profile?.demographics?.gender_id && parsed.gender) {
        const genderMap: Record<string, number> = { male: 1, female: 2 };
        const expected = genderMap[parsed.gender.toLowerCase()];
        if (profile.demographics.gender_id !== expected) {
          mismatches.push(
            `Gender: profile shows ID ${profile.demographics.gender_id}, ID shows ${parsed.gender}`,
          );
        }
      }

      return { mismatches };
    },
    [nameMatchesAny, normalizeString, datesMatch],
  );

  // ─── Submit to Backend ──────────────────────────────────────────────
  const submitVerification = useCallback(async (idNum: string) => {
    setStatusMsg("Submitting verification…");
    try {
      const res = await authService.verifyID(idNum);
      if (res.success) {
        setVerificationResult({ success: true, data: res });
        setStep("result");
        setShowResult(true);
      } else {
        alert("Verification Failed: " + (res.message || "Please try again."));
        setStep("scanning");
      }
    } catch (err: any) {
      alert("Error: " + (err?.message || "Something went wrong."));
      setStep("scanning");
    }
  }, []);

  // ─── Full Verification Flow ──────────────────────────────────────────
  const runVerification = useCallback(
    async (parsed: ParsedID) => {
      setIsProcessing(true);
      setStatusMsg("Validating ID number…");

      try {
        const validateRes = await authService.validateIDNumber(parsed.idNumber);
        if (!validateRes.success) {
          alert("Invalid ID: " + (validateRes.message || "Please try again."));
          setStep("scanning");
          setIsProcessing(false);
          return;
        }

        const { mismatches } = compareWithProfile(parsed);

        // Build confirmation message
        let confirmMsg = `ID Scanned\n\n`;
        confirmMsg += `ID Number: ${parsed.idNumber}\n`;
        if (parsed.fullNames) confirmMsg += `Name: ${parsed.fullNames}\n`;
        if (parsed.surname) confirmMsg += `Surname: ${parsed.surname}\n`;
        if (parsed.date_of_birth)
          confirmMsg += `DOB: ${parsed.date_of_birth}\n`;
        if (parsed.gender) confirmMsg += `Gender: ${parsed.gender}\n`;
        if (mismatches.length) {
          confirmMsg += `\n⚠️ Mismatches with your profile:\n${mismatches.join(
            "\n",
          )}\n`;
        }
        confirmMsg += `\nProceed with verification?`;

        if (window.confirm(confirmMsg)) {
          await submitVerification(parsed.idNumber);
        } else {
          setStep("scanning");
        }
        setIsProcessing(false);
      } catch (err: any) {
        alert("Error: " + (err?.message || "Something went wrong."));
        setStep("scanning");
        setIsProcessing(false);
      }
    },
    [compareWithProfile, submitVerification],
  );

  // ─── Start Scanning ──────────────────────────────────────────────────
  const startScanning = useCallback(async () => {
    try {
      setIsScanning(true);
      setStatusMsg("Checking scanner support...");

      // Check if BarcodeDetector is supported
      if (!("BarcodeDetector" in window)) {
        alert(
          "Your browser doesn't support barcode scanning.\n\n" +
            "Please use Chrome, Edge, or Safari.\n" +
            "You can also enter your ID manually.",
        );
        setStep("manual");
        setIsScanning(false);
        return;
      }

      // Check if PDF417 is supported
      const formats = await (
        window as any
      ).BarcodeDetector.getSupportedFormats();
      if (!formats.includes("pdf417") && !formats.includes("pdf_417")) {
        alert(
          "PDF417 barcode format is not supported in this browser.\n\n" +
            "Please try using the manual entry option.",
        );
        setStep("manual");
        setIsScanning(false);
        return;
      }

      setStatusMsg("Starting camera...");

      // Start camera
      await startCamera();

      // Create detector
      detectorRef.current = new (window as any).BarcodeDetector({
        formats: ["pdf417"],
      });

      setStatusMsg("Point camera at the barcode on the back of your ID");

      // Start scan loop
      const scanFrame = async () => {
        if (!videoRef.current || !detectorRef.current || !isScanning) {
          return;
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawData = barcodes[0].rawValue;
            console.log("📸 Barcode detected:", rawData.substring(0, 50));

            if (rawData) {
              setIsScanning(false);
              stopCamera();

              const parsed = parseSAIDBarcode(rawData);
              if (parsed.idNumber && parsed.idNumber.length === 13) {
                setScanResult(parsed);
                await runVerification(parsed);
              } else {
                const tryManual = window.confirm(
                  `Could not extract a valid 13-digit ID number.\n\n` +
                    `Raw data: ${rawData.substring(0, 100)}\n\n` +
                    `Would you like to enter the ID manually?`,
                );
                if (tryManual) {
                  setStep("manual");
                } else {
                  setStep("scanning");
                  startScanning();
                }
              }
              return;
            }
          }
        } catch (error) {
          // No barcode found, continue scanning
        }

        if (isScanning) {
          scanLoopRef.current = requestAnimationFrame(scanFrame);
        }
      };

      scanFrame();
    } catch (error: any) {
      console.error("Failed to start scanning:", error);
      if (error.name === "NotAllowedError") {
        setCameraError("Camera permission was denied.");
        setStep("permission-denied");
      } else {
        alert(
          "Failed to start scanning: " + (error.message || "Please try again."),
        );
        setStep("manual");
      }
      setIsScanning(false);
    }
  }, [startCamera, stopCamera, isScanning, parseSAIDBarcode, runVerification]);

  // ─── Stop Scanning ──────────────────────────────────────────────────
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    stopCamera();
  }, [stopCamera]);

  // ─── Photo Upload ────────────────────────────────────────────────────
  const handlePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      event.target.value = "";
      stopScanning();
      setIsProcessing(true);
      setStatusMsg("Reading barcode from photo…");

      try {
        // Check if BarcodeDetector is supported
        if (!("BarcodeDetector" in window)) {
          throw new Error("Barcode detection not supported");
        }

        const bitmap = await createImageBitmap(file);
        const detector = new (window as any).BarcodeDetector({
          formats: ["pdf417"],
        });
        const barcodes = await detector.detect(bitmap);

        if (barcodes && barcodes.length > 0) {
          const rawData = barcodes[0].rawValue;
          const parsed = parseSAIDBarcode(rawData);

          if (parsed.idNumber && parsed.idNumber.length === 13) {
            setScanResult(parsed);
            await runVerification(parsed);
          } else {
            alert(
              "Could not extract a valid 13-digit ID number from that photo.",
            );
            setStep("scanning");
            setIsProcessing(false);
          }
        } else {
          alert("Could not read a barcode from that photo.");
          setStep("scanning");
          setIsProcessing(false);
        }
      } catch (error: any) {
        alert(
          "Could not read barcode from photo: " +
            (error.message || "Please try again with better lighting."),
        );
        setStep("scanning");
        setIsProcessing(false);
      }
    },
    [parseSAIDBarcode, runVerification, stopScanning],
  );

  // ─── Manual Entry ────────────────────────────────────────────────────
  const handleManualVerify = useCallback(async () => {
    const id = idNumber.trim();
    if (!/^\d{13}$/.test(id)) {
      alert("Enter a valid 13-digit SA ID number.");
      return;
    }
    if (id !== confirmIdNumber.trim()) {
      alert("ID numbers do not match.");
      return;
    }
    await runVerification({
      idNumber: id,
      surname: "",
      fullNames: "",
      first_name: "",
      middle_names: "",
      last_name: "",
      date_of_birth: "",
      gender: "",
      citizenship: "",
    });
  }, [idNumber, confirmIdNumber, runVerification]);

  // ─── Load Profile ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const cached = authService.getCachedUser();
        if (cached && mounted) {
          setUserProfile(cached);
          userProfileRef.current = cached;
        } else if (mounted) {
          const fresh = await authService.getCurrentUser();
          setUserProfile(fresh);
          userProfileRef.current = fresh;
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
      if (mounted) {
        setStep("scanning");
        setTimeout(() => startScanning(), 500);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
      stopScanning();
    };
  }, [startScanning, stopScanning]);

  // ─── Cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  // ─── Render: Loading ─────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div style={styles.root}>
        <div style={styles.centerContainer}>
          <RefreshCw size={32} className="spin" color="#fb8500" />
          <span style={styles.loadingText}>Loading your profile…</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin .8s linear infinite; }`}</style>
      </div>
    );
  }

  // ─── Render: Permission Denied ──────────────────────────────────────
  if (step === "permission-denied") {
    return (
      <div style={styles.root}>
        <div style={styles.permissionContainer}>
          <div style={styles.permissionIcon}>
            <Camera size={40} color="#fb8500" />
          </div>
          <h2 style={styles.permissionTitle}>Camera Access Needed</h2>
          <p style={styles.permissionMsg}>
            {cameraError || "Allow camera access to scan your ID barcode."}
          </p>
          <button
            style={styles.primaryButton}
            onClick={() => {
              setStep("scanning");
              startScanning();
            }}
          >
            Try Again
          </button>
          <button
            style={styles.secondaryButton}
            onClick={() => setStep("manual")}
          >
            Enter ID Manually
          </button>
          <button
            style={styles.uploadButton}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <ImageIcon size={16} />
            Upload Photo
          </button>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
        </div>
      </div>
    );
  }

  // ─── Render: Manual Entry ────────────────────────────────────────────
  if (step === "manual") {
    return (
      <div style={{ ...styles.root, background: "#fff" }}>
        <div style={styles.manualContainer}>
          <button
            style={styles.backButton}
            onClick={() => {
              setStep("scanning");
              startScanning();
            }}
          >
            <X size={20} color="#fb8500" />
            <span style={styles.backButtonText}>Back to Scanner</span>
          </button>

          <h2 style={styles.manualTitle}>Enter ID Manually</h2>

          <div style={styles.inputGroup}>
            <label style={styles.label}>SA ID Number</label>
            <input
              style={styles.input}
              type="text"
              value={idNumber}
              onChange={(e) =>
                setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))
              }
              placeholder="13-digit SA ID number"
              maxLength={13}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm ID Number</label>
            <input
              style={styles.input}
              type="text"
              value={confirmIdNumber}
              onChange={(e) =>
                setConfirmIdNumber(
                  e.target.value.replace(/\D/g, "").slice(0, 13),
                )
              }
              placeholder="Re-enter ID number"
              maxLength={13}
            />
          </div>

          <button style={styles.primaryButton} onClick={handleManualVerify}>
            Verify
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Processing ──────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div style={{ ...styles.root, background: "#000" }}>
        <div style={styles.centerContainer}>
          <RefreshCw size={40} className="spin" color="#fff" />
          <p style={styles.processingText}>{statusMsg}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin .8s linear infinite; }`}</style>
      </div>
    );
  }

  // ─── Render: Result ──────────────────────────────────────────────────
  if (step === "result" && showResult) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
          <div style={styles.resultIcon}>
            {verificationResult?.success ? (
              <ShieldCheck size={60} color="#16a34a" />
            ) : (
              <Shield size={60} color="#f59e0b" />
            )}
          </div>
          <h2 style={styles.resultTitle}>
            {verificationResult?.success
              ? "Identity Verified ✓"
              : "Verification Failed"}
          </h2>
          <p style={styles.resultSubtitle}>
            {verificationResult?.success
              ? "Your identity has been verified successfully"
              : "Please try again or contact support"}
          </p>
          {scanResult && (
            <div style={styles.resultDetails}>
              <div>
                <span style={styles.resultLabel}>ID Number:</span>
                <span style={styles.resultValue}>{scanResult.idNumber}</span>
              </div>
              {scanResult.fullNames && (
                <div>
                  <span style={styles.resultLabel}>Name:</span>
                  <span style={styles.resultValue}>{scanResult.fullNames}</span>
                </div>
              )}
              {scanResult.surname && (
                <div>
                  <span style={styles.resultLabel}>Surname:</span>
                  <span style={styles.resultValue}>{scanResult.surname}</span>
                </div>
              )}
            </div>
          )}
          <button
            style={styles.resultButton}
            onClick={() => {
              setShowResult(false);
              onBack();
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Scanning ─────────────────────────────────────────────────
  return (
    <div style={{ ...styles.root, background: "#000", position: "relative" }}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.headerButton}>
          <X size={20} color="#fff" />
        </button>
        <h1 style={styles.headerTitle}>Scan ID Barcode</h1>
        {torchSupported && (
          <button onClick={toggleTorch} style={styles.headerButton}>
            {torchOn ? (
              <ZapOff size={18} color="#fff" />
            ) : (
              <Zap size={18} color="#fff" />
            )}
          </button>
        )}
        {!torchSupported && <div style={{ width: 40 }} />}
      </div>

      {/* Camera View */}
      <video
        ref={videoRef}
        style={{
          width: "100%",
          height: "calc(100vh - 60px)",
          objectFit: "cover",
          position: "absolute",
          top: 60,
          left: 0,
        }}
        playsInline
        muted
        autoPlay
      />

      {/* Scan Overlay */}
      <div style={styles.overlay}>
        <div style={styles.scanFrame}>
          <p style={styles.scanHint}>{statusMsg}</p>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div style={styles.processingOverlay}>
          <RefreshCw size={40} className="spin" color="#fff" />
          <p style={styles.processingOverlayText}>Processing ID…</p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actionsBar}>
        <button
          style={styles.actionButton}
          onClick={() => {
            stopScanning();
            setStep("manual");
          }}
        >
          <ImageIcon size={16} color="#fff" style={{ marginRight: 8 }} />
          Enter Manually
        </button>
        <button
          style={{ ...styles.actionButton, marginTop: 10 }}
          onClick={() => document.getElementById("fileInput")?.click()}
        >
          <ImageIcon size={16} color="#fff" style={{ marginRight: 8 }} />
          Upload Photo
        </button>
      </div>

      <input
        id="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handlePhotoUpload}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin .8s linear infinite; }`}</style>
    </div>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    alignItems: "center",
    background: "#000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
  },
  loadingText: {
    marginTop: 16,
    color: "#9ca3af",
    fontSize: 14,
  },
  processingText: {
    marginTop: 16,
    color: "#fff",
    fontSize: 16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    width: "100%",
    background: "rgba(0,0,0,0.6)",
    zIndex: 20,
    height: 60,
    boxSizing: "border-box",
    position: "absolute",
    top: 0,
    left: 0,
  },
  headerButton: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
  },
  headerTitle: {
    flex: 1,
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 60,
    left: 0,
    width: "100%",
    height: "calc(100vh - 60px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 10,
  },
  scanFrame: {
    width: 280,
    height: 160,
    border: "2px solid rgba(251,133,0,0.8)",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 16px 16px",
  },
  scanHint: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    margin: 0,
    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
    background: "rgba(0,0,0,0.4)",
    borderRadius: 6,
    padding: "4px 8px",
  },
  processingOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  processingOverlayText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  actionsBar: {
    position: "absolute",
    bottom: 30,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
    zIndex: 20,
  },
  actionButton: {
    background: "rgba(0,0,0,0.65)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    padding: "12px 28px",
    borderRadius: 30,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    background: "#f9fafb",
    width: "100%",
    maxWidth: 400,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 8,
    marginTop: 0,
  },
  permissionMsg: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: "center",
    marginBottom: 24,
  },
  primaryButton: {
    background: "#fb8500",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  },
  secondaryButton: {
    background: "#f3f4f6",
    color: "#1a1a2e",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
    marginTop: 10,
  },
  uploadButton: {
    background: "#e5e7eb",
    color: "#1a1a2e",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manualContainer: {
    padding: 24,
    width: "100%",
    maxWidth: 400,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#fb8500",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: 0,
  },
  backButtonText: {
    marginLeft: 4,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 20,
    color: "#1a1a2e",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    display: "block",
    fontWeight: 600,
    fontSize: 13,
    marginBottom: 4,
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "2px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 2000,
  },
  modalContent: {
    background: "#fff",
    borderRadius: 20,
    padding: 32,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
  },
  resultIcon: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 8,
    marginTop: 0,
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  resultDetails: {
    width: "100%",
    background: "#f9fafb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    marginRight: 8,
  },
  resultValue: {
    fontSize: 14,
    color: "#1a1a2e",
    fontWeight: 500,
  },
  resultButton: {
    background: "#fb8500",
    color: "#fff",
    border: "none",
    padding: "14px 32px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
    width: "100%",
  },
};

export default VerifyIDPage;
