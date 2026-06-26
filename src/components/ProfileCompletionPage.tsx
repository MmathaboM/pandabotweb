// src/pages/ProfileCompletionPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";

import type { CompletionBreakdown } from "../utils/profileCompletion";
import { calculateProfileCompletion } from "../utils/profileCompletion";
import EditProfilePage from "../components/profile/edit";
import DocumentsPage from "./profile/DocumentsPage";
import CVBuilderPage from "./profile/CVBuilder";
// import { IDVerificationCard } from "@/components/verification/IDVerificationCard";
import { IDVerificationCard } from "./profile/verification/IDVerificationCard";
import { VerifyIDPage } from "./profile/verification/VerificationPage";
// ── Types & helper components ──────────────────────────────────────────────
interface SectionInfo {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  progress: number;
  detail: string;
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={130} height={130} style={{ display: "block" }}>
      <circle
        cx={65}
        cy={65}
        r={r}
        stroke="#f0f0f0"
        strokeWidth={10}
        fill="none"
      />
      <circle
        cx={65}
        cy={65}
        r={r}
        stroke="var(--pc-primary)"
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        style={{
          transformOrigin: "65px 65px",
          transform: "rotate(-90deg)",
          transition: "stroke-dashoffset 0.6s ease",
        }}
      />
      <text
        x={65}
        y={60}
        textAnchor="middle"
        fontSize={26}
        fontWeight="700"
        fill="var(--pc-primary)"
      >
        {percent}%
      </text>
      <text x={65} y={78} textAnchor="middle" fontSize={12} fill="#9ca3af">
        Complete
      </text>
    </svg>
  );
}

function SectionCard({
  section,
  onClick,
}: {
  section: SectionInfo;
  onClick: () => void;
}) {
  const Icon = section.icon;
  return (
    <button type="button" className="pc-card" onClick={onClick}>
      <div className="pc-card__body">
        <div className="pc-card__icon" style={{ background: section.bgColor }}>
          <Icon size={22} color={section.color} />
        </div>
        <div className="pc-card__text">
          <span className="pc-card__title">{section.title}</span>
          <span className="pc-card__subtitle">{section.subtitle}</span>
        </div>
        <div className="pc-card__right">
          <span className="pc-card__detail" style={{ color: section.color }}>
            {section.detail}
          </span>
          <ChevronRight size={17} color="#aaa" />
        </div>
      </div>
      <div className="pc-bar-track">
        <div
          className="pc-bar-fill"
          style={{
            width: `${Math.max(section.progress, 2)}%`,
            background: `linear-gradient(90deg, ${section.color}, ${section.color}bb)`,
          }}
        />
      </div>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
interface ProfileCompletionPageProps {
  onBack?: () => void;
}

const ProfileCompletionPage: React.FC<ProfileCompletionPageProps> = ({
  onBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [breakdown, setBreakdown] = useState<CompletionBreakdown | null>(null);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [currentScreen, setCurrentScreen] = useState<
    "completion" | "edit" | "documents" | "cv" | "verifyId"
  >("completion");

  const buildSections = useCallback(
    (data: CompletionBreakdown): SectionInfo[] => {
      const { personal, documents, cv } = data;
      return [
        {
          key: "personal",
          title: "Personal Info",
          subtitle: personal.missing.length
            ? `Missing: ${personal.missing.slice(0, 2).join(", ")}${personal.missing.length > 2 ? "…" : ""}`
            : "All fields completed",
          icon: User,
          color: "#fb8500",
          bgColor: "#fff3e0",
          progress: personal.percentage,
          detail: `${Math.round(personal.percentage)}%`,
        },
        {
          key: "documents",
          title: "Documents",
          subtitle:
            documents.totalRequired === 0
              ? "No documents required"
              : documents.totalMissing === 0
                ? "All required documents uploaded"
                : `${documents.totalRequired - documents.totalMissing} of ${documents.totalRequired} uploaded`,
          icon: FileText,
          color: "#0ea5e9",
          bgColor: "#e0f2fe",
          progress: documents.percentage,
          detail:
            documents.totalRequired === 0
              ? "N/A"
              : `${documents.totalRequired - documents.totalMissing}/${documents.totalRequired}`,
        },
        {
          key: "cv",
          title: "CV Builder",
          subtitle:
            cv.completedSections === 0
              ? "Not started"
              : cv.completedSections === 3
                ? "All sections completed"
                : `${cv.completedSections} of 3 sections filled`,
          icon: BookOpen,
          color: "#16a34a",
          bgColor: "#dcfce7",
          progress: cv.percentage,
          detail: `${cv.completedSections}/3`,
        },
      ];
    },
    [],
  );

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        const data = await calculateProfileCompletion();
        setBreakdown(data);
        setSections(buildSections(data));
      } catch (err) {
        console.error("[ProfileCompletion] load error", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildSections],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBackToCompletion = () => {
    setCurrentScreen("completion");
    loadData(true);
  };

  // ── Child screens ──────────────────────────────────────────────────────
  if (currentScreen === "edit") {
    return <EditProfilePage onBack={handleBackToCompletion} />;
  }
  if (currentScreen === "documents") {
    return <DocumentsPage onBack={handleBackToCompletion} />;
  }
  if (currentScreen === "cv") {
    return <CVBuilderPage onBack={handleBackToCompletion} />;
  }
  if (currentScreen === "verifyId") {
    return <VerifyIDPage onBack={handleBackToCompletion} />;
  }

  // ── Main completion view ──────────────────────────────────────────────
  const overall = breakdown?.overall ?? 0;
  const motivationText =
    overall >= 100
      ? "Your profile is complete!"
      : overall >= 75
        ? "Almost there! Just a few more steps."
        : overall >= 50
          ? "You're halfway there — keep going."
          : "Let's get your profile set up.";

  return (
    <>
      <style>{CSS}</style>
      <div className="pc-root">
        {/* ─── Fixed Header ─── */}
        <div className="pc-header">
          <button
            type="button"
            className="pc-header__back"
            onClick={() => {
              if (onBack) onBack();
              else window.history.back();
            }}
          >
            <ChevronRight
              size={20}
              color="#fff"
              style={{ transform: "rotate(180deg)" }}
            />
          </button>
          <h1 className="pc-header__title">Complete Your Profile</h1>
          <button
            type="button"
            className="pc-header__refresh"
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw
              size={18}
              color="#fff"
              className={refreshing ? "pc-spin" : ""}
            />
          </button>
        </div>

        {/* ─── Scrollable Content ─── */}
        <div className="pc-body">
          {loading ? (
            <div className="pc-loading">
              <div className="pc-spinner" />
              <span>Loading your profile data…</span>
            </div>
          ) : (
            <>
              <div className="pc-ring-section">
                <ProgressRing percent={overall} />
                <p className="pc-ring-title">
                  {overall >= 100 ? "Profile Complete!" : "Profile Progress"}
                </p>
                <p className="pc-ring-sub">{motivationText}</p>
              </div>

              {breakdown && (
                <IDVerificationCard
                  onVerifyPress={() => setCurrentScreen("verifyId")}
                />
              )}

              <div className="pc-sections">
                {sections.map((section) => (
                  <SectionCard
                    key={section.key}
                    section={section}
                    onClick={() => {
                      if (section.key === "personal") setCurrentScreen("edit");
                      else if (section.key === "documents")
                        setCurrentScreen("documents");
                      else if (section.key === "cv") setCurrentScreen("cv");
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileCompletionPage;

// ── Scoped CSS ────────────────────────────────────────────────────────────────
const CSS = `
  :root {
    --pc-primary: #fb8500;
    --pc-primary-start: #fb8500;
    --pc-primary-end: #f5a623;
    --pc-bg: #f4f5f7;
    --pc-card: #ffffff;
    --pc-text: #1a1a2e;
    --pc-muted: #9ca3af;
    --pc-radius: 16px;
  }

  /* ── Fixed overlay container ── */
  .pc-root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: var(--pc-bg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* ── Header (fixed at top) ── */
  .pc-header {
    background: linear-gradient(135deg, var(--pc-primary-start), var(--pc-primary-end));
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 10;
  }
  .pc-header__back,
  .pc-header__refresh {
    background: rgba(255,255,255,0.2);
    border: none;
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .pc-header__back:hover,
  .pc-header__refresh:hover { background: rgba(255,255,255,0.3); }
  .pc-header__title {
    flex: 1;
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #fff;
    text-align: center;
  }

  @keyframes pc-rotate { to { transform: rotate(360deg); } }
  .pc-spin { animation: pc-rotate 0.8s linear infinite; }

  /* ── Scrollable body ── */
  .pc-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px 80px;
  }

  /* ── Loading ── */
  .pc-loading {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px; padding: 80px 0;
    color: var(--pc-muted); font-size: 14px;
  }
  .pc-spinner {
    width: 32px; height: 32px;
    border: 3px solid #e5e7eb;
    border-top-color: var(--pc-primary);
    border-radius: 50%;
    animation: pc-rotate 0.7s linear infinite;
  }

  /* ── Ring section ── */
  .pc-ring-section {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .pc-ring-title {
    margin: 14px 0 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--pc-text);
    text-align: center;
  }
  .pc-ring-sub {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--pc-muted);
    text-align: center;
  }

  /* ── ID Verification card ── */
  .pc-id-card {
    background: var(--pc-card);
    border-radius: var(--pc-radius);
    padding: 14px 16px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1.5px solid #fde68a;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .pc-id-card--verified { border-color: #bbf7d0; }
  .pc-id-card__left {
    display: flex; align-items: center; gap: 12px; flex: 1;
  }
  .pc-id-card__icon {
    width: 42px; height: 42px;
    border-radius: 12px;
    background: #fefce8;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pc-id-card--verified .pc-id-card__icon { background: #f0fdf4; }
  .pc-id-card__text { display: flex; flex-direction: column; gap: 2px; }
  .pc-id-card__title { font-size: 15px; font-weight: 600; color: var(--pc-text); }
  .pc-id-card__sub { font-size: 13px; color: var(--pc-muted); }
  .pc-id-card__badge {
    font-size: 12px; font-weight: 600;
    color: #92400e;
    background: #fef3c7;
    padding: 3px 10px;
    border-radius: 20px;
  }
  .pc-id-card__verify-btn {
    background: var(--pc-primary);
    color: #fff;
    border: none;
    padding: 6px 16px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .pc-id-card__verify-btn:hover { opacity: 0.85; }

  /* ── Section cards ── */
  .pc-sections { display: flex; flex-direction: column; gap: 12px; }

  .pc-card {
    background: var(--pc-card);
    border-radius: var(--pc-radius);
    padding: 16px;
    width: 100%;
    border: none;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .pc-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  }
  .pc-card:active { transform: translateY(0); }

  .pc-card__body {
    display: flex;
    align-items: center;
    gap: 0;
  }
  .pc-card__icon {
    width: 46px; height: 46px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    margin-right: 14px;
    flex-shrink: 0;
  }
  .pc-card__text {
    flex: 1;
    display: flex; flex-direction: column; gap: 2px;
    min-width: 0;
  }
  .pc-card__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--pc-text);
  }
  .pc-card__subtitle {
    font-size: 13px;
    color: var(--pc-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pc-card__right {
    display: flex; align-items: center; gap: 4px;
    margin-left: 8px; flex-shrink: 0;
  }
  .pc-card__detail {
    font-size: 14px; font-weight: 700;
  }

  .pc-bar-track {
    height: 5px;
    background: #f0f0f0;
    border-radius: 3px;
    margin-top: 14px;
    overflow: hidden;
  }
  .pc-bar-fill {
    height: 5px;
    border-radius: 3px;
    transition: width 0.6s ease;
  }
`;
