import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit3,
  X,
  Camera,
  Mail,
  Phone,
  User,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { calculateProfileCompletion } from "../utils/profileCompletion";
import ProfileCompletionPage from "./ProfileCompletionPage";
import EditProfilePage from "./profile/edit";
import MyApplicationsPage from "./profile/MyApplicationsPage";
import PrivacyPolicyScreen from "./legal/PrivacyPolicy";
import TermsScreen from "./legal/TermsAndConditions";
import ProfileHeader from "./profile/ProfileHeader";
import HelpCenter from "./help/HelpCenter";

const HEADER_HEIGHT = 220;

interface Props {
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
}

// Completion ring component
function CompletionRing({ percent }: { percent: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={52} height={52} style={{ display: "block" }}>
      <circle
        cx={26}
        cy={26}
        r={r}
        stroke="#f0f0f0"
        strokeWidth={4}
        fill="none"
      />
      <circle
        cx={26}
        cy={26}
        r={r}
        stroke="var(--primary)"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        style={{
          transformOrigin: "26px 26px",
          transform: "rotate(-90deg)",
          transition: "stroke-dashoffset 0.6s ease",
        }}
      />
      <text
        x={26}
        y={30}
        textAnchor="middle"
        fontSize={11}
        fontWeight="700"
        fill="var(--primary)"
        style={{ fontFamily: "inherit" }}
      >
        {percent}%
      </text>
    </svg>
  );
}

// Profile row component
function ProfileRow({
  icon: Icon,
  label,
  value,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`pf-row${onClick ? " pf-row--clickable" : ""}${danger ? " pf-row--danger" : ""}`}
      onClick={onClick}
      disabled={!onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="pf-row__left">
        <div
          className="pf-row__icon-wrap"
          style={danger ? { background: "#fef2f2" } : {}}
        >
          <Icon size={20} color={danger ? "#dc2626" : "var(--primary)"} />
        </div>
        <div className="pf-row__text">
          <span
            className="pf-row__label"
            style={danger ? { color: "#dc2626" } : {}}
          >
            {label}
          </span>
          {value && <span className="pf-row__value">{value}</span>}
        </div>
      </div>
      {onClick && (
        <ChevronRight size={18} color={danger ? "#dc2626" : "#aaa"} />
      )}
    </button>
  );
}

const ProfileTab: React.FC<Props> = ({ onLogout, onNavigate }) => {
  const { user, refreshUser } = useAuth();

  const [completionPercent, setCompletionPercent] = useState(0);
  const [showCompletionPage, setShowCompletionPage] = useState(false);
  const [showEditPage, setShowEditPage] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [showMyApplicationsPage, setShowMyApplicationsPage] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    calculateProfileCompletion()
      .then((data) => setCompletionPercent(data.overall))
      .catch(() => setCompletionPercent(0));
  }, []);

  const displayName =
    user?.full_name ??
    (`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Learner");
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=fb8500&color=fff&size=200`;
  const userAny = user as any;
  const currentAvatar =
    avatarUrl ??
    (userAny?.avatar ? (userAny.avatar as string) : fallbackAvatar);

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    setIsLoggingOut(true);
    try {
      await authService.logout();
      onLogout?.();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const preview = URL.createObjectURL(file);
      setAvatarUrl(preview);
      // TODO: call profileService.uploadAvatar(file) when ready
    } catch {
      alert("Failed to update photo.");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setFormError("New passwords don't match");
      return;
    }
    if (newPw.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    setFormError("");
    setIsChangingPw(true);
    try {
      await authService.changePassword(currentPw, newPw);
      setShowPwModal(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      alert("Password changed successfully");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleBackFromCompletion = () => {
    calculateProfileCompletion()
      .then((data) => setCompletionPercent(data.overall))
      .catch(() => {});
    setShowCompletionPage(false);
  };

  // 👇 FIX: separate handler for Help Center
  const handleBackFromHelp = () => {
    setShowHelp(false);
    calculateProfileCompletion()
      .then((data) => setCompletionPercent(data.overall))
      .catch(() => {});
  };

  const handleEditSave = async () => {
    await refreshUser();
    setShowEditPage(false);
    calculateProfileCompletion()
      .then((data) => setCompletionPercent(data.overall))
      .catch(() => {});
  };

  // ─── Sub‑screens ─────────────────────────────────────────────────────────────
  if (showPrivacyPolicy)
    return <PrivacyPolicyScreen onBack={() => setShowPrivacyPolicy(false)} />;
  if (showTerms) return <TermsScreen onBack={() => setShowTerms(false)} />;
  if (showCompletionPage)
    return <ProfileCompletionPage onBack={handleBackFromCompletion} />;
  if (showEditPage)
    return (
      <EditProfilePage
        onSave={handleEditSave}
        onBack={() => setShowEditPage(false)}
      />
    );
  if (showMyApplicationsPage)
    return (
      <MyApplicationsPage onBack={() => setShowMyApplicationsPage(false)} />
    );
  if (showHelp) return <HelpCenter onBack={handleBackFromHelp} />;

  // ─── Main view ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      {/* Fixed orange header — sits on top, content scrolls beneath it */}
      <div style={styles.fixedHeader}>
        <ProfileHeader
          displayName={displayName}
          email={user?.email}
          avatarUrl={currentAvatar}
          isUploadingAvatar={isUploadingAvatar}
          onAvatarClick={() => setShowAvatarViewer(true)}
          onAvatarFileChange={handleAvatarFileChange}
        />
      </div>

      {/* Scrollable content pushed down by HEADER_HEIGHT */}
      <div style={{ paddingTop: HEADER_HEIGHT, paddingBottom: 80 }}>
        <div className="pf-body">
          <div
            className="pf-completion-card"
            onClick={() => setShowCompletionPage(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setShowCompletionPage(true)}
          >
            <div className="pf-completion-card__left">
              <CompletionRing percent={completionPercent} />
              <div className="pf-completion-card__text">
                <span className="pf-completion-card__title">
                  Profile Completion
                </span>
                <span className="pf-completion-card__sub">
                  {completionPercent >= 100
                    ? "Your profile is complete!"
                    : "Tap to complete your profile"}
                </span>
              </div>
            </div>
            <ChevronRight size={18} color="var(--primary)" />
          </div>

          {/* Account */}
          {/* <section className="pf-section">
            <h3 className="pf-section__title">Account</h3>
            <div className="pf-card">
              <ProfileRow icon={User} label="Name" value={displayName} />
              <div className="pf-divider" />
              <ProfileRow icon={Mail} label="Email" value={user?.email} />
              {user?.phone && (
                <>
                  <div className="pf-divider" />
                  <ProfileRow icon={Phone} label="Phone" value={user.phone} />
                </>
              )}
            </div>
          </section> */}

          {/* Settings */}
          <section className="pf-section">
            <h3 className="pf-section__title">Settings</h3>
            <div className="pf-card">
              <ProfileRow
                icon={Edit3}
                label="Edit Profile"
                value="Update your info"
                onClick={() => setShowEditPage(true)}
              />
              <div className="pf-divider" />
              <ProfileRow
                icon={Shield}
                label="Privacy & Security"
                value="Manage your data"
                onClick={() => setShowPwModal(true)}
              />
              <div className="pf-divider" />
              <ProfileRow
                icon={HelpCircle}
                label="Help Center"
                value="FAQs and support"
                onClick={() => setShowHelp(true)}
              />
              <div className="pf-divider" />
            </div>
          </section>

          {/* Legal */}
          <section className="pf-section">
            <h3 className="pf-section__title">Legal</h3>
            <div className="pf-card">
              <ProfileRow
                icon={FileText}
                label="Terms and Conditions"
                value="View our terms of service"
                onClick={() => setShowTerms(true)}
              />
              <div className="pf-divider" />
              <ProfileRow
                icon={Shield}
                label="Privacy Policy"
                value="How we protect your data"
                onClick={() => setShowPrivacyPolicy(true)}
              />
            </div>
          </section>

          {/* My Opportunities */}
          <section className="pf-section">
            <h3 className="pf-section__title">My Opportunities</h3>
            <div className="pf-card">
              <ProfileRow
                icon={Briefcase}
                label="My Applications"
                value="Track your opportunity applications"
                onClick={() => setShowMyApplicationsPage(true)}
              />
              <div className="pf-divider" />
            </div>
          </section>

          {/* Logout */}
          <button
            type="button"
            className="pf-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <div className="pf-spinner pf-spinner--white" />
            ) : (
              <>
                <LogOut size={20} color="#fff" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────────────── */}

      {/* Avatar viewer overlay */}
      {showAvatarViewer && (
        <div className="pf-overlay" onClick={() => setShowAvatarViewer(false)}>
          <button
            className="pf-overlay__close"
            onClick={() => setShowAvatarViewer(false)}
          >
            <X size={20} color="#fff" />
          </button>
          <img
            src={currentAvatar}
            alt={displayName}
            className="pf-overlay__img"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="pf-overlay__name">{displayName}</p>
          <button
            type="button"
            className="pf-overlay__edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowAvatarViewer(false);
              setTimeout(() => fileInputRef.current?.click(), 200);
            }}
          >
            <Camera size={16} color="#fff" />
            <span>Change Photo</span>
          </button>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="pf-modal-overlay" onClick={() => setShowPwModal(false)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal__header">
              <h3>Change Password</h3>
              <button
                type="button"
                className="pf-modal__close"
                onClick={() => setShowPwModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="pf-modal__form">
              <label className="pf-modal__label">Current password</label>
              <input
                className="pf-modal__input"
                type="password"
                placeholder="Current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
              <label className="pf-modal__label">New password</label>
              <input
                className="pf-modal__input"
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
              />
              <label className="pf-modal__label">Confirm new password</label>
              <input
                className="pf-modal__input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
              {formError && <p className="pf-modal__error">{formError}</p>}
              <button
                type="submit"
                className="pf-modal__submit"
                disabled={isChangingPw}
              >
                {isChangingPw ? "Changing…" : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileTab;

// ── Fixed header positioning ──
const styles: { [key: string]: React.CSSProperties } = {
  fixedHeader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
};

const CSS = `
  :root {
    --primary: #fb8500;
    --primary-light: rgba(251,133,0,0.12);
    --bg: #f4f5f7;
    --card-bg: #ffffff;
    --text-primary: #1a1a2e;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --divider: #f0f0f0;
    --radius-card: 16px;
    --radius-icon: 12px;
    --danger: #dc2626;
  }

  .pf-body {
    background: var(--bg);
    padding: 20px 16px 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .pf-completion-card { display: flex; align-items: center; justify-content: space-between; background: var(--card-bg); border-radius: var(--radius-card); padding: 14px 16px; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(251,133,0,0.10); border: 1px solid rgba(251,133,0,0.13); cursor: pointer; transition: transform 0.15s; }
  .pf-completion-card:hover { transform: translateY(-1px); }
  .pf-completion-card__left { display: flex; align-items: center; gap: 14px; flex: 1; }
  .pf-completion-card__text { display: flex; flex-direction: column; gap: 2px; }
  .pf-completion-card__title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
  .pf-completion-card__sub { font-size: 13px; color: var(--text-muted); }
  .pf-section { margin-bottom: 24px; }
  .pf-section__title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin: 0 0 10px 4px; }
  .pf-card { background: var(--card-bg); border-radius: var(--radius-card); overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .pf-divider { height: 1px; background: var(--divider); margin: 0 16px; }
  .pf-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: transparent; border: none; width: 100%; text-align: left; transition: background 0.12s; }
  .pf-row--clickable:hover { background: rgba(0,0,0,0.02); }
  .pf-row--clickable:active { background: rgba(0,0,0,0.04); }
  .pf-row__left { display: flex; align-items: center; flex: 1; gap: 12px; min-width: 0; }
  .pf-row__icon-wrap { width: 38px; height: 38px; border-radius: var(--radius-icon); background: var(--primary-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pf-row__text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .pf-row__label { font-size: 15px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pf-row__value { font-size: 13px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pf-logout-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 15px; background: var(--danger); color: #fff; font-size: 15px; font-weight: 700; border: none; border-radius: var(--radius-card); cursor: pointer; margin-top: 8px; transition: opacity 0.15s; }
  .pf-logout-btn:hover { opacity: 0.9; }
  .pf-logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .pf-spinner { width: 20px; height: 20px; border: 2.5px solid rgba(0,0,0,0.12); border-top-color: var(--primary); border-radius: 50%; animation: pf-spin 0.7s linear infinite; }
  .pf-spinner--white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
  @keyframes pf-spin { to { transform: rotate(360deg); } }
  .pf-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,0.93); display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .pf-overlay__close { position: absolute; top: 52px; right: 20px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.15); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .pf-overlay__img { width: 260px; height: 260px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.2); }
  .pf-overlay__name { margin: 22px 0 0; font-size: 20px; font-weight: 700; color: #fff; }
  .pf-overlay__edit-btn { display: flex; align-items: center; gap: 8px; margin-top: 18px; padding: 13px 28px; background: var(--primary); color: #fff; font-size: 14px; font-weight: 700; border: none; border-radius: 50px; cursor: pointer; transition: opacity 0.15s; }
  .pf-overlay__edit-btn:hover { opacity: 0.9; }
  .pf-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; }
  @media (min-width: 480px) { .pf-modal-overlay { align-items: center; } }
  .pf-modal { background: #fff; border-radius: 20px 20px 0 0; width: 100%; max-width: 480px; padding: 24px; max-height: 90vh; overflow-y: auto; }
  @media (min-width: 480px) { .pf-modal { border-radius: 20px; } }
  .pf-modal__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .pf-modal__header h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--text-primary); }
  .pf-modal__close { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; }
  .pf-modal__form { display: flex; flex-direction: column; gap: 4px; }
  .pf-modal__label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-top: 8px; }
  .pf-modal__input { width: 100%; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 15px; color: var(--text-primary); outline: none; box-sizing: border-box; transition: border-color 0.15s; font-family: inherit; }
  .pf-modal__input:focus { border-color: var(--primary); }
  .pf-modal__error { font-size: 13px; color: var(--danger); margin: 4px 0 0; }
  .pf-modal__submit { margin-top: 16px; padding: 14px; background: var(--primary); color: #fff; font-size: 15px; font-weight: 700; border: none; border-radius: 12px; cursor: pointer; transition: opacity 0.15s; font-family: inherit; }
  .pf-modal__submit:hover { opacity: 0.9; }
  .pf-modal__submit:disabled { opacity: 0.6; cursor: not-allowed; }
`;
