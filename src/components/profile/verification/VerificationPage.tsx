import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, RefreshCw, Camera, Image as ImageIcon } from "lucide-react";
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
  | "manual";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Check if native BarcodeDetector API supports PDF417
const isNativeDetectorSupported = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return false;
  }
  try {
    const formats: string[] = await (
      window as any
    ).BarcodeDetector.getSupportedFormats();
    return formats.includes("pdf_417") || formats.includes("pdf417");
  } catch {
    return false;
  }
};

export const VerifyIDPage: React.FC<VerifyIDPageProps> = ({ onBack }) => {
  const [step, setStep] = useState<VerifyStep>("loading");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [idNumber, setIdNumber] = useState("");
  const [confirmIdNumber, setConfirmIdNumber] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState(
    "Point camera at the barcode on the back of your ID",
  );
  const [useNativeScanner, setUseNativeScanner] = useState(false);

  // Refs for native scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanningActiveRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userProfileRef = useRef<any>(null);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // ─── Stop scanner ───────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    scanningActiveRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
  }, []);

  // ─── SA ID barcode parser ─────────────────────────────────────────────
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

  // ─── Profile comparison ────────────────────────────────────────────────
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

  // ─── Submit to backend ─────────────────────────────────────────────────
  const submitVerification = useCallback(
    async (idNum: string) => {
      setStatusMsg("Submitting verification…");
      try {
        const res = await authService.verifyID(idNum);
        if (res.success) {
          alert(
            "ID verified successfully!\n\nYou now have a higher trust score and priority application processing.",
          );
          onBack();
        } else {
          alert(res.message || "Verification failed. Please try again.");
          setStep("scanning");
        }
      } catch (err: any) {
        alert(err?.message || "Something went wrong. Please try again.");
        setStep("scanning");
      }
    },
    [onBack],
  );

  // ─── Full verify flow ──────────────────────────────────────────────────
  const runVerification = useCallback(
    async (parsed: ParsedID) => {
      setStep("processing");
      setStatusMsg("Validating ID number…");

      try {
        const validateRes = await authService.validateIDNumber(parsed.idNumber);
        if (!validateRes.success) {
          alert(validateRes.message || "Invalid ID number. Please try again.");
          setStep("scanning");
          return;
        }

        const { mismatches } = compareWithProfile(parsed);

        const confirmMsg =
          `ID scanned\n\n` +
          `ID Number: ${parsed.idNumber}\n` +
          (parsed.fullNames ? `Name on ID: ${parsed.fullNames}\n` : "") +
          (parsed.surname ? `Surname: ${parsed.surname}\n` : "") +
          (parsed.date_of_birth ? `DOB: ${parsed.date_of_birth}\n` : "") +
          (parsed.gender ? `Gender: ${parsed.gender}\n` : "") +
          (mismatches.length
            ? `\nMismatches with your profile:\n${mismatches.join("\n")}\n`
            : "") +
          `\nProceed with verification?`;

        if (!window.confirm(confirmMsg)) {
          setStep("scanning");
          return;
        }

        await submitVerification(parsed.idNumber);
      } catch (err: any) {
        alert(err?.message || "Something went wrong. Please try again.");
        setStep("scanning");
      }
    },
    [compareWithProfile, submitVerification],
  );

  // ─── Native BarcodeDetector loop ──────────────────────────────────────
  const runNativeDetectionLoop = useCallback(async () => {
    scanningActiveRef.current = true;
    while (scanningActiveRef.current) {
      if (
        !videoRef.current ||
        !detectorRef.current ||
        videoRef.current.readyState < 2
      ) {
        await sleep(120);
        continue;
      }
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes && barcodes.length > 0 && scanningActiveRef.current) {
          const raw = barcodes[0].rawValue as string;
          scanningActiveRef.current = false;
          await stopScanner();

          const parsed = parseSAIDBarcode(raw);
          if (!parsed.idNumber || parsed.idNumber.length !== 13) {
            const tryManual = window.confirm(
              `Could not extract a valid 13-digit ID number.\n\n` +
                `Raw data: ${raw.substring(0, 100)}\n\n` +
                `Enter ID manually?`,
            );
            setStep(tryManual ? "manual" : "scanning");
            return;
          }
          await runVerification(parsed);
          return;
        }
      } catch {
        // Per-frame detection errors are normal — ignore and keep looping
      }
      await sleep(150);
    }
  }, [stopScanner, parseSAIDBarcode, runVerification]);

  // ─── Start scanner ─────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    await stopScanner();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
    } catch {
      setCameraError(
        "Camera permission was denied. Allow camera access and try again, or take a photo of the barcode instead.",
      );
      setStep("permission-denied");
      return;
    }

    const nativeOk = await isNativeDetectorSupported();
    setUseNativeScanner(nativeOk);

    if (nativeOk) {
      streamRef.current = stream;
      await sleep(0);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Some browsers need a user gesture; ignore
        }
      }
      try {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ["pdf417"],
        });
      } catch {
        detectorRef.current = null;
      }
      runNativeDetectionLoop();
    } else {
      // No native support - show manual entry
      stream.getTracks().forEach((t) => t.stop());
      alert(
        "Your browser doesn't support scanning PDF417 barcodes.\n\n" +
          "Please use the manual entry option or upload a photo of your ID.",
      );
      setStep("manual");
    }
  }, [stopScanner, runNativeDetectionLoop]);

  // ─── Photo fallback: decode a still image ─────────────────────────────
  const handlePhotoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      await stopScanner();
      setStep("processing");
      setStatusMsg("Reading barcode from photo…");

      try {
        const nativeOk = await isNativeDetectorSupported();

        if (nativeOk && "createImageBitmap" in window) {
          const bitmap = await createImageBitmap(file);
          const detector = new (window as any).BarcodeDetector({
            formats: ["pdf417"],
          });
          const barcodes = await detector.detect(bitmap);
          if (!barcodes || barcodes.length === 0) {
            throw new Error("No barcode found");
          }
          const parsed = parseSAIDBarcode(barcodes[0].rawValue);
          if (!parsed.idNumber || parsed.idNumber.length !== 13) {
            alert(
              `Could not extract a valid 13-digit ID number from that photo.\n\n` +
                `Try again with better lighting, hold the camera steady, and make sure the barcode isn't blurry — or enter your ID manually.`,
            );
            setStep("scanning");
            return;
          }
          await runVerification(parsed);
        } else {
          throw new Error("No barcode detection available");
        }
      } catch {
        alert(
          "Could not read a barcode from that photo. Try again in better lighting and hold the camera steady so the barcode isn't blurry — or enter your ID manually.",
        );
        setStep("scanning");
      }
    },
    [stopScanner, parseSAIDBarcode, runVerification],
  );

  // ─── Manual entry submit ───────────────────────────────────────────────
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

  // ─── Load profile on mount ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = authService.getCachedUser();
        if (cached) {
          setUserProfile(cached);
          userProfileRef.current = cached;
        } else {
          const fresh = await authService.getCurrentUser();
          if (!cancelled) {
            setUserProfile(fresh);
            userProfileRef.current = fresh;
          }
        }
      } catch {
        // Non-fatal
      }
      if (!cancelled) setStep("scanning");
    })();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [stopScanner]);

  // ─── Start scanner when step becomes "scanning" ──────────────────────
  const isScanning = step === "scanning";
  useEffect(() => {
    if (!isScanning) return;
    const t = setTimeout(() => startScanner(), 120);
    return () => clearTimeout(t);
  }, [isScanning, startScanner]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // ─── Render: loading ───────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div style={s.root}>
        <RefreshCw
          size={32}
          style={{ animation: "spin .8s linear infinite", color: "#fb8500" }}
        />
        <span style={{ marginTop: 16, color: "#9ca3af", fontSize: 14 }}>
          Loading your profile…
        </span>
        <style>{KEYFRAMES}</style>
      </div>
    );
  }

  // ─── Render: permission denied ─────────────────────────────────────────
  if (step === "permission-denied") {
    return (
      <div
        style={{
          ...s.root,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <div style={s.permCard}>
          <div style={s.permIcon}>
            <Camera size={40} color="#fb8500" />
          </div>
          <h2 style={s.permTitle}>Camera access needed</h2>
          <p style={s.permMsg}>
            {cameraError || "Allow camera access to scan your ID barcode."}
          </p>
          <button style={s.btnPrimary} onClick={() => setStep("scanning")}>
            Try again
          </button>
          <button
            style={{ ...s.btnSecondary, marginTop: 10 }}
            onClick={() => fileInputRef.current?.click()}
          >
            Take a photo instead
          </button>
          <button
            style={{ ...s.btnSecondary, marginTop: 10 }}
            onClick={() => setStep("manual")}
          >
            Enter ID manually
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handlePhotoSelected}
        />
        <style>{KEYFRAMES}</style>
      </div>
    );
  }

  // ─── Render: manual entry ──────────────────────────────────────────────
  if (step === "manual") {
    return (
      <div
        style={{
          ...s.root,
          background: "#fff",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <button
            onClick={() => setStep("scanning")}
            style={{
              background: "none",
              border: "none",
              color: "#fb8500",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: 20,
              padding: 0,
            }}
          >
            ← Back to scanner
          </button>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 20,
              color: "#1a1a2e",
            }}
          >
            Enter ID manually
          </h2>
          <div style={s.inputGroup}>
            <label style={s.label}>SA ID number</label>
            <input
              style={s.input}
              type="text"
              value={idNumber}
              onChange={(e) =>
                setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))
              }
              placeholder="13-digit SA ID number"
              maxLength={13}
            />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Confirm ID number</label>
            <input
              style={s.input}
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
          <button
            style={{ ...s.btnPrimary, width: "100%", marginTop: 8 }}
            onClick={handleManualVerify}
          >
            Verify
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: processing ─────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div
        style={{
          ...s.root,
          background: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <RefreshCw
          size={40}
          style={{ animation: "spin .8s linear infinite", color: "#fff" }}
        />
        <p style={{ color: "#fff", marginTop: 16, fontSize: 16 }}>
          {statusMsg}
        </p>
        <style>{KEYFRAMES}</style>
      </div>
    );
  }

  // ─── Render: scanning ──────────────────────────────────────────────────
  return (
    <div style={{ ...s.root, background: "#000" }}>
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>
          <X size={20} color="#fff" />
        </button>
        <h1 style={s.headerTitle}>Scan ID barcode</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Native detector video element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          width: "100%",
          height: "calc(100vh - 60px)",
          objectFit: "cover",
          display: useNativeScanner ? "block" : "none",
        }}
      />

      {!useNativeScanner && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            width: "100%",
            height: "calc(100vh - 60px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#000",
            padding: 24,
          }}
        >
          <p
            style={{
              color: "#fff",
              fontSize: 18,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            Your browser doesn't support scanning PDF417 barcodes.
          </p>
          <button
            style={{ ...s.btnPrimary, maxWidth: 300 }}
            onClick={() => setStep("manual")}
          >
            Enter ID manually
          </button>
          <button
            style={{ ...s.btnSecondary, maxWidth: 300, marginTop: 12 }}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload a photo of your ID
          </button>
        </div>
      )}

      <div style={s.overlay}>
        <div style={s.scanFrame}>
          <p style={s.scanHint}>{statusMsg}</p>
        </div>
      </div>

      <div style={s.actionsBar}>
        <button
          style={s.manualBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={16} style={{ marginRight: 8 }} />
          Take a photo instead
        </button>
        <button
          style={s.manualBtn}
          onClick={() => {
            stopScanner();
            setStep("manual");
          }}
        >
          Enter ID manually
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handlePhotoSelected}
      />

      <style>{KEYFRAMES}</style>
    </div>
  );
};

// ─── Constants ──────────────────────────────────────────────────────────────
const KEYFRAMES = `@keyframes spin { to { transform: rotate(360deg); } }`;

// ─── Styles ─────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
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
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    width: "100%",
    background: "rgba(0,0,0,0.6)",
    zIndex: 20,
    height: 60,
    boxSizing: "border-box",
  },
  backBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
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
  manualBtn: {
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
  permCard: {
    background: "#fff",
    borderRadius: 20,
    padding: "32px 24px",
    maxWidth: 400,
    width: "100%",
    textAlign: "center",
  },
  permIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  permTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 8,
  },
  permMsg: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  btnPrimary: {
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
  btnSecondary: {
    background: "#f3f4f6",
    color: "#1a1a2e",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  },
  inputGroup: { marginBottom: 14 },
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
};
