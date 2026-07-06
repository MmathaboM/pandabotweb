// VerifyIDPage.tsx
//
// NOTE: requires the `@zxing/library` package:
//   npm install @zxing/library
//
// We use a pure-JS decoder (ZXing) instead of the native BarcodeDetector API
// because BarcodeDetector isn't implemented in Safari/iOS at all, and its
// PDF417 support is inconsistent across Android browsers too. ZXing decodes
// entirely in JS so behaviour is identical on iOS, Android, and desktop.
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, RefreshCw, ImagePlus, Shield, ShieldCheck } from "lucide-react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";
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

type VerifyStep = "loading" | "upload" | "processing" | "result";

// ─── Robust barcode detection helpers ────────────────────────────────────
// The uploaded photo may have the barcode at any rotation and anywhere in
// the frame, so we try several rotations and a couple of scales rather than
// requiring the user to line the barcode up in a fixed box.

const ROTATIONS = [0, 90, 180, 270] as const;
const MAX_DIMENSIONS = [1800, 2600, 1100]; // try a normal, a larger, and a smaller render

function drawRotatedCanvas(
  bitmap: ImageBitmap,
  degrees: number,
  maxDim: number,
): HTMLCanvasElement {
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = width * scale;
  const h = height * scale;

  const canvas = document.createElement("canvas");
  const rotatedDims = degrees === 90 || degrees === 270;
  canvas.width = rotatedDims ? h : w;
  canvas.height = rotatedDims ? w : h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Mild grayscale/contrast boost — helps the detector pick out the
  // barcode bars from busy ID-card backgrounds and uneven lighting.
  (ctx as any).filter = "grayscale(1) contrast(1.35)";

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);

  return canvas;
}

const zxingHints = new Map();
zxingHints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);
zxingHints.set(DecodeHintType.TRY_HARDER, true);

/**
 * Tries to find a PDF417 barcode anywhere in the given image file,
 * regardless of how it's rotated or positioned in the frame.
 * Returns the raw barcode string, or null if nothing was found.
 *
 * Uses ZXing (pure JS) rather than the native BarcodeDetector API, since
 * BarcodeDetector doesn't exist in Safari/iOS and is unreliable for PDF417
 * on several Android browsers.
 */
async function detectBarcodeFromFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<string | null> {
  const reader = new BrowserMultiFormatReader(zxingHints as any);
  const bitmap = await createImageBitmap(file);

  try {
    for (const maxDim of MAX_DIMENSIONS) {
      for (const degrees of ROTATIONS) {
        onProgress?.(`Scanning photo… (${degrees}°)`);
        const canvas = drawRotatedCanvas(bitmap, degrees, maxDim);
        const dataUrl = canvas.toDataURL("image/png");
        try {
          const result = await reader.decodeFromImageUrl(dataUrl);
          const text = result?.getText();
          if (text) return text;
        } catch (err) {
          // NotFoundException just means no barcode at this rotation/scale —
          // keep trying the others. Any other error is logged but non-fatal.
          if (!(err instanceof NotFoundException)) {
            console.warn("ZXing decode attempt failed:", err);
          }
        }
      }
    }
    return null;
  } finally {
    bitmap.close?.();
    reader.reset();
  }
}

export const VerifyIDPage: React.FC<VerifyIDPageProps> = ({ onBack }) => {
  const [step, setStep] = useState<VerifyStep>("loading");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState("Reading barcode from photo…");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ParsedID | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const userProfileRef = useRef<any>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  // The API nests sa_id_number in a couple of different places depending on
  // which endpoint populated the profile — check all of them.
  const getProfileIdNumber = useCallback((profile: any): string | null => {
    const raw =
      profile?.sa_id_number ??
      profile?.demographics?.sa_id_number ??
      profile?.personal_info?.sa_id_number ??
      null;
    return raw ? String(raw).replace(/\D/g, "") : null;
  }, []);

  const compareWithProfile = useCallback(
    (parsed: ParsedID): { blocking: string[]; warnings: string[] } => {
      const profile = userProfileRef.current;
      const blocking: string[] = [];
      const warnings: string[] = [];

      // ── ID number — the most important check. If the profile already has
      // an ID number on file, the scanned ID MUST match it exactly. ──
      const profileIdNumber = getProfileIdNumber(profile);
      if (
        profileIdNumber &&
        parsed.idNumber &&
        profileIdNumber !== parsed.idNumber
      ) {
        blocking.push(
          `ID number does not match your profile (profile ends in ${profileIdNumber.slice(-4)}, scanned ID ends in ${parsed.idNumber.slice(-4)}).`,
        );
      }

      // ── First name — must appear somewhere in the ID's full names. ──
      if (profile?.first_name && parsed.fullNames) {
        if (!nameMatchesAny(profile.first_name, parsed.fullNames)) {
          blocking.push(
            `First name "${profile.first_name}" was not found on the scanned ID.`,
          );
        }
      }

      // ── Surname — must match exactly. ──
      if (profile?.last_name && parsed.surname) {
        if (
          normalizeString(profile.last_name) !== normalizeString(parsed.surname)
        ) {
          blocking.push(
            `Surname "${profile.last_name}" does not match the ID's surname "${parsed.surname}".`,
          );
        }
      }

      // ── Softer checks — shown as a warning, but don't block verification. ──
      if (profile?.demographics?.date_of_birth && parsed.date_of_birth) {
        if (
          !datesMatch(profile.demographics.date_of_birth, parsed.date_of_birth)
        ) {
          warnings.push(
            `Date of birth: profile shows ${profile.demographics.date_of_birth}, ID shows ${parsed.date_of_birth}`,
          );
        }
      }
      if (profile?.demographics?.gender_id && parsed.gender) {
        const genderMap: Record<string, number> = { male: 1, female: 2 };
        const expected = genderMap[parsed.gender.toLowerCase()];
        if (expected && profile.demographics.gender_id !== expected) {
          warnings.push(
            `Gender: profile shows a different gender than the ID.`,
          );
        }
      }

      return { blocking, warnings };
    },
    [getProfileIdNumber, nameMatchesAny, normalizeString, datesMatch],
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
        setStep("upload");
      }
    } catch (err: any) {
      alert("Error: " + (err?.message || "Something went wrong."));
      setStep("upload");
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
          setStep("upload");
          setIsProcessing(false);
          return;
        }

        const { blocking, warnings } = compareWithProfile(parsed);

        // Hard stop — this ID doesn't belong to the logged-in user's profile.
        if (blocking.length > 0) {
          alert(
            "This ID doesn't match your profile, so it can't be used to verify your account:\n\n" +
              blocking.join("\n") +
              "\n\nPlease scan your own South African ID and try again.",
          );
          setStep("upload");
          setIsProcessing(false);
          return;
        }

        let confirmMsg = `ID Scanned\n\n`;
        confirmMsg += `ID Number: ${parsed.idNumber}\n`;
        if (parsed.fullNames) confirmMsg += `Name: ${parsed.fullNames}\n`;
        if (parsed.surname) confirmMsg += `Surname: ${parsed.surname}\n`;
        if (parsed.date_of_birth)
          confirmMsg += `DOB: ${parsed.date_of_birth}\n`;
        if (parsed.gender) confirmMsg += `Gender: ${parsed.gender}\n`;
        if (warnings.length) {
          confirmMsg += `\n⚠️ ${warnings.join("\n")}\n`;
        }
        confirmMsg += `\nProceed with verification?`;

        if (window.confirm(confirmMsg)) {
          await submitVerification(parsed.idNumber);
        } else {
          setStep("upload");
        }
        setIsProcessing(false);
      } catch (err: any) {
        alert("Error: " + (err?.message || "Something went wrong."));
        setStep("upload");
        setIsProcessing(false);
      }
    },
    [compareWithProfile, submitVerification],
  );

  // ─── Photo Upload (camera capture or gallery) ────────────────────────
  const handlePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = "";

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));

      setStep("processing");
      setIsProcessing(true);
      setStatusMsg("Reading barcode from photo…");

      try {
        // No BarcodeDetector feature-check here on purpose — ZXing is a pure-JS
        // decoder, so it runs identically on iOS Safari, Android, and desktop.
        const rawData = await detectBarcodeFromFile(file, setStatusMsg);

        if (!rawData) {
          alert(
            "Couldn't find a barcode in that photo.\n\n" +
              "Make sure the barcode on the back of your ID is visible somewhere in the shot " +
              "and try a clearer or better-lit photo.",
          );
          setStep("upload");
          return;
        }

        const parsed = parseSAIDBarcode(rawData);
        if (parsed.idNumber && parsed.idNumber.length === 13) {
          setScanResult(parsed);
          await runVerification(parsed);
        } else {
          alert(
            "Could not extract a valid 13-digit ID number from that photo. Please try another photo.",
          );
          setStep("upload");
        }
      } catch (error: any) {
        alert(
          "Could not read barcode from photo: " +
            (error.message || "Please try again with a clearer photo."),
        );
        setStep("upload");
      } finally {
        setIsProcessing(false);
      }
    },
    [previewUrl, parseSAIDBarcode, runVerification],
  );

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
        setStep("upload");
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

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

  // ─── Render: Upload ──────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div style={{ ...styles.root, background: "#fff" }}>
        <div style={styles.header}>
          <button onClick={onBack} style={styles.headerButtonDark}>
            <X size={20} color="#1a1a2e" />
          </button>
          <h1 style={styles.headerTitleDark}>Verify Your ID</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.uploadContainer}>
          <div style={styles.uploadIcon}>
            <ImagePlus size={40} color="#fb8500" />
          </div>
          <h2 style={styles.uploadTitle}>Photo of your ID barcode</h2>
          <p style={styles.uploadMsg}>
            Choose a clear photo showing the barcode on the back of your SA ID.
            It doesn't need to be perfectly lined up — any angle or orientation
            works, as long as the barcode is visible in the shot.
          </p>

          <button
            style={styles.primaryButton}
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus size={18} style={{ marginRight: 8 }} />
            Choose from Gallery
          </button>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
        </div>
      </div>
    );
  }

  // ─── Render: Processing ──────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div style={{ ...styles.root, background: "#000" }}>
        <div style={styles.centerContainer}>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Uploaded ID"
              style={styles.previewThumb}
            />
          )}
          <RefreshCw
            size={40}
            className="spin"
            color="#fff"
            style={{ marginTop: 20 }}
          />
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

  return null;
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
    textAlign: "center",
    padding: "0 24px",
  },
  previewThumb: {
    width: 220,
    height: 140,
    objectFit: "cover",
    borderRadius: 12,
    border: "2px solid rgba(255,255,255,0.2)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    width: "100%",
    maxWidth: 480,
    boxSizing: "border-box",
  },
  headerButtonDark: {
    background: "#f3f4f6",
    border: "none",
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  headerTitleDark: {
    flex: 1,
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a2e",
    textAlign: "center",
  },
  uploadContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    width: "100%",
    maxWidth: 420,
    boxSizing: "border-box",
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "#fff3e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 8,
    marginTop: 0,
    textAlign: "center",
  },
  uploadMsg: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: "center",
    marginBottom: 28,
  },
  primaryButton: {
    background: "#fb8500",
    color: "#fff",
    border: "none",
    padding: "14px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    background: "#f3f4f6",
    color: "#1a1a2e",
    border: "none",
    padding: "14px 24px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
