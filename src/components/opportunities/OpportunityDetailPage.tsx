// src/components/opportunities/OpportunityDetailPage.tsx
import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Bell,
  BellOff,
  Briefcase,
  Eye,
  X,
} from "lucide-react";
import { opportunitiesService } from "../../services/opportunitiesService";
import { getApiError } from "../../services/api";
import { documentsService, UserDocument } from "../../services/document";
import { calculateProfileCompletion } from "../../utils/profileCompletion";
import type { Opportunity } from "../../types";
import PageHeader from "../../components/PageHeader";
import ProfileCompletionPage from "../ProfileCompletionPage";
import { getFullImageUrl } from "../../utils/images";

// ─── Color scheme ──────────────────────────────────────────────────────────
const colors = {
  primary: { start: "#fb8500", end: "#e85d04", DEFAULT: "#fb8500" },
  text: {
    primary: "#1F2933",
    secondary: "#616E7C",
    muted: "#9AA5B1",
    inverse: "#FFFFFF",
  },
  background: { light: "#FFFFFF", input: "#F5F7FA", card: "#FFFFFF" },
  border: { light: "#E4E7EB", DEFAULT: "#CBD2D9" },
  status: { success: "#00CD50", error: "#FF647C", warning: "#FFDE70" },
};

interface OpportunityDetailPageProps {
  id?: string;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const getDisplayValue = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.name) return value.name;
  return String(value);
};

// ─── Main component ──────────────────────────────────────────────────────
export const OpportunityDetailPage: React.FC<OpportunityDetailPageProps> = ({
  id: propId,
  onBack,
  onNavigate,
}) => {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  // Profile completion state
  const [profileCompletion, setProfileCompletion] = useState<{
    percentage: number;
    isComplete: boolean;
    loading: boolean;
  }>({ percentage: 0, isComplete: false, loading: true });

  // Notification subscription state
  const [subscription, setSubscription] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const urlId = params.get("id");
  const opportunityId = propId || urlId;

  // Load opportunity details
  useEffect(() => {
    if (!opportunityId) {
      setError("No opportunity ID provided");
      setLoading(false);
      return;
    }

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await opportunitiesService.getOpportunityDetails(
          parseInt(opportunityId, 10),
        );
        setOpportunity(response.data);
      } catch (err) {
        setError(getApiError(err));
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [opportunityId]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!opportunity?.opportunity_type_id) {
        setCheckingSubscription(false);
        return;
      }
      try {
        const sub = await opportunitiesService.checkSubscription(
          opportunity.opportunity_type_id,
        );
        setSubscription(sub);
      } catch {
        // ignore
      } finally {
        setCheckingSubscription(false);
      }
    };
    if (opportunity) checkSubscription();
  }, [opportunity]);

  // Load profile completion
  useEffect(() => {
    const loadProfileCompletion = async () => {
      try {
        const result = await calculateProfileCompletion();
        setProfileCompletion({
          percentage: result.overall,
          isComplete: result.overall >= 100,
          loading: false,
        });
      } catch (error) {
        console.error("Failed to load profile completion:", error);
        setProfileCompletion((prev) => ({ ...prev, loading: false }));
      }
    };
    loadProfileCompletion();
  }, []);

  const goToProfileCompletion = () => {
    setShowProfileCompletion(true);
  };

  // Open apply modal and fetch documents
  const openApplyModal = async () => {
    setShowApplyModal(true);
    try {
      const docs = await documentsService.getMyDocuments();
      setDocuments(docs);
    } catch {
      setDocuments([]);
    }
    setSelectedDocIds([]);
  };

  const toggleDocument = (docId: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const openDocument = async (url: string, filename?: string) => {
    if (!url) return;
    setDownloadingDoc(url);
    try {
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error opening document:", error);
      alert("Failed to open document");
    } finally {
      setDownloadingDoc(null);
    }
  };

  // Toggle subscription
  const handleToggleSubscription = async () => {
    if (!opportunity?.opportunity_type_id) return;
    setSubscribing(true);
    try {
      if (subscription) {
        await opportunitiesService.unsubscribeFromType(subscription.id);
        setSubscription(null);
        alert(
          `Unsubscribed – you will no longer receive notifications for ${getDisplayValue(
            opportunity.type,
          )} opportunities.`,
        );
      } else {
        const newSub = await opportunitiesService.subscribeToType(
          opportunity.opportunity_type_id,
          { email: true, push: true },
        );
        setSubscription(newSub);
        alert(
          `Subscribed! You'll receive notifications when new ${getDisplayValue(
            opportunity.type,
          )} opportunities are posted.`,
        );
      }
    } catch (e: any) {
      alert(
        e.response?.data?.message ||
          "Failed to update notification preferences.",
      );
    } finally {
      setSubscribing(false);
    }
  };

  // Submit application
  const handleApply = async () => {
    if (!opportunityId) return;
    setApplying(true);
    try {
      await opportunitiesService.apply(
        parseInt(opportunityId, 10),
        selectedDocIds.length > 0 ? selectedDocIds : undefined,
      );
      setShowApplyModal(false);
      alert("Application submitted successfully!");
      onBack?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to apply.");
    } finally {
      setApplying(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: colors.text.muted, marginTop: 12 }}>
          Loading opportunity...
        </p>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────
  if (error || !opportunity) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.errorText}>{error || "Opportunity not found"}</p>
        <button
          onClick={onBack || (() => window.history.back())}
          style={styles.backButton}
        >
          Go Back
        </button>
      </div>
    );
  }

  // ─── Profile completion page ──────────────────────────────────────────
  if (showProfileCompletion) {
    return (
      <ProfileCompletionPage onBack={() => setShowProfileCompletion(false)} />
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────
  const opp = opportunity;
  const opportunityTypeName = getDisplayValue(opp.type);
  const imageUrl = getFullImageUrl(opp.image);

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.root}>
        <PageHeader
          title="Opportunity"
          onBack={onBack || (() => window.history.back())}
        />

        <div style={styles.scrollContent}>
          {/* Banner image */}
          {imageUrl ? (
            <div
              style={styles.imageWrapper}
              onClick={() => setShowImageModal(true)}
            >
              <img
                src={imageUrl}
                alt={opp.title}
                style={styles.image}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const wrapper = (e.target as HTMLElement).parentElement;
                  if (wrapper) {
                    const accent = document.createElement("div");
                    accent.style.cssText = `
                      height: 6px;
                      background: linear-gradient(90deg, ${colors.primary.start}, ${colors.primary.end});
                    `;
                    wrapper.appendChild(accent);
                  }
                }}
              />
            </div>
          ) : (
            <div style={styles.accentBar} />
          )}

          <div style={styles.content}>
            <h2 style={styles.title}>{getDisplayValue(opp.title)}</h2>
            <p style={styles.company}>
              {getDisplayValue(opp.company_name || opp.company)}
            </p>

            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                <MapPin size={15} color={colors.text.muted} />
                <span>
                  {opp.province?.name || opp.location || "South Africa"}
                </span>
              </span>
              <span style={styles.metaItem}>
                <Clock size={15} color={colors.text.muted} />
                <span>
                  Closes{" "}
                  {opp.closing_date
                    ? new Date(opp.closing_date).toLocaleDateString("en-ZA")
                    : "N/A"}
                </span>
              </span>
            </div>

            {opp.salary && (
              <div style={styles.salaryBox}>
                <p style={styles.salaryLabel}>Salary</p>
                <p style={styles.salaryValue}>
                  {opp.salary.startsWith("R") ? opp.salary : `R ${opp.salary}`}
                </p>
              </div>
            )}

            {/* ─── Description ────────────────────────────────────────── */}
            <h3 style={styles.sectionTitle}>Description</h3>
            <p style={styles.description}>
              {opp.description || "No description available."}
            </p>

            {/* ─── Action Buttons (moved back to original position) ── */}
            <div style={styles.actionSection}>
              {/* Notification Subscription Card */}
              {opp.opportunity_type_id && (
                <div
                  style={{
                    ...styles.notifyCard,
                    ...(subscription ? styles.notifyCardActive : {}),
                  }}
                >
                  <div style={styles.notifyIconContainer}>
                    {subscription ? (
                      <Bell size={20} color={colors.primary.DEFAULT} />
                    ) : (
                      <BellOff size={20} color={colors.text.muted} />
                    )}
                  </div>
                  <div style={styles.notifyTextContainer}>
                    <p style={styles.notifyTitle}>
                      {subscription ? "Notifications On" : "Get Notified"}
                    </p>
                    <p style={styles.notifySubtitle}>
                      {subscription
                        ? `Receiving alerts for ${opportunityTypeName} opportunities`
                        : `Be notified when similar ${opportunityTypeName} opportunities are posted`}
                    </p>
                  </div>
                  {subscribing || checkingSubscription ? (
                    <div style={styles.spinnerSmall} />
                  ) : (
                    <button
                      onClick={handleToggleSubscription}
                      style={{
                        ...styles.notifyToggle,
                        ...(subscription ? styles.notifyToggleActive : {}),
                      }}
                      aria-label="Toggle notification"
                    >
                      <div
                        style={{
                          ...styles.notifyToggleKnob,
                          ...(subscription
                            ? styles.notifyToggleKnobActive
                            : styles.notifyToggleKnobInactive),
                        }}
                      />
                    </button>
                  )}
                </div>
              )}

              {/* Apply / Profile Gate */}
              {profileCompletion.loading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: 20,
                  }}
                >
                  <div style={styles.spinner} />
                </div>
              ) : opp.has_applied ? (
                <div style={styles.appliedContainer}>
                  <div style={styles.appliedBadge}>
                    <Briefcase size={20} color={colors.status.success} />
                    <span style={styles.appliedText}>Already Applied</span>
                  </div>
                  <p style={styles.appliedHint}>
                    You can view your application status in My Opportunities
                  </p>
                </div>
              ) : profileCompletion.isComplete ? (
                <button style={styles.applyBtn} onClick={openApplyModal}>
                  <Briefcase size={20} color="#fff" />
                  <span style={styles.applyBtnText}>Apply with Documents</span>
                </button>
              ) : (
                <div style={styles.profileIncompleteContainer}>
                  <p style={styles.profileIncompleteMessage}>
                    Complete your profile before applying for opportunities
                  </p>
                  <div style={styles.progressBarContainer}>
                    <div style={styles.progressBarTrack}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${profileCompletion.percentage}%`,
                        }}
                      />
                    </div>
                    <p style={styles.progressBarText}>
                      {profileCompletion.percentage}% Complete
                    </p>
                  </div>
                  <button
                    style={styles.completeProfileBtn}
                    onClick={goToProfileCompletion}
                  >
                    <span style={styles.completeProfileBtnText}>
                      Complete Profile
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Extra bottom padding to ensure content isn't hidden behind tabs */}
            <div style={styles.bottomSpacer} />
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && imageUrl && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowImageModal(false)}
        >
          <div style={styles.imageModalContent}>
            <img src={imageUrl} alt={opp.title} style={styles.fullImage} />
            <button
              onClick={() => setShowImageModal(false)}
              style={styles.closeModalBtn}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowApplyModal(false)}
        >
          <div
            style={styles.applyModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Select Documents</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={colors.text.secondary} />
              </button>
            </div>
            <p style={styles.modalHint}>
              Choose documents to attach to your application (CV, ID, etc.)
            </p>
            {documents.length === 0 ? (
              <p style={styles.emptyDocs}>
                No documents found. Upload documents in your profile first.
              </p>
            ) : (
              <div style={styles.docList}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      ...styles.docItem,
                      ...(selectedDocIds.includes(doc.id)
                        ? styles.docItemSelected
                        : {}),
                    }}
                  >
                    <div
                      style={styles.docItemContent}
                      onClick={() => toggleDocument(doc.id)}
                    >
                      <div
                        style={{
                          ...styles.docCheckbox,
                          ...(selectedDocIds.includes(doc.id)
                            ? styles.docCheckboxSelected
                            : {}),
                        }}
                      >
                        {selectedDocIds.includes(doc.id) && (
                          <span
                            style={{
                              color: "#fff",
                              fontSize: 12,
                              lineHeight: 1,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={styles.docName}>
                          {doc.original_filename
                            ? decodeURIComponent(doc.original_filename)
                            : "Document"}
                        </p>
                        <p style={styles.docType}>{doc.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        openDocument(doc.file_url || "", doc.original_filename)
                      }
                      disabled={downloadingDoc === doc.file_url}
                      style={styles.viewIconBtn}
                    >
                      {downloadingDoc === doc.file_url ? (
                        <div style={styles.spinnerSmall} />
                      ) : (
                        <Eye size={20} color={colors.primary.DEFAULT} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                ...styles.submitBtn,
                ...(applying ? styles.submitBtnDisabled : {}),
              }}
            >
              {applying ? (
                <div style={styles.spinnerSmall} />
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles: { [key: string]: React.CSSProperties } = {
  root: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    backgroundColor: "#F8F9FA",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 1000,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  scrollContent: {
    flex: 1,
    overflowY: "auto",
    maxWidth: 600,
    width: "100%",
    margin: "0 auto",
    paddingBottom: 120, // Increased bottom padding to ensure content isn't hidden behind tabs
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #E2E8F0",
    borderTopColor: colors.primary.DEFAULT,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  spinnerSmall: {
    width: 20,
    height: 20,
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorText: { color: colors.status.error, marginBottom: 16, fontSize: 14 },
  backButton: {
    padding: "10px 20px",
    background: colors.primary.DEFAULT,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "600",
  },
  accentBar: {
    height: 6,
    background: `linear-gradient(90deg, ${colors.primary.start}, ${colors.primary.end})`,
  },
  imageWrapper: { cursor: "pointer", overflow: "hidden" },
  image: {
    width: "100%",
    maxHeight: 260,
    objectFit: "cover",
    display: "block",
  },
  content: { padding: "24px 20px 0" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
    marginTop: 0,
    color: colors.text.primary,
    lineHeight: 1.2,
  },
  company: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 16,
    marginTop: 0,
    fontWeight: "500",
  },
  metaRow: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
    flexWrap: "wrap" as const,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: "500",
  },
  salaryBox: {
    backgroundColor: colors.background.input,
    padding: "12px 16px",
    borderRadius: 12,
    marginBottom: 20,
    borderLeft: `4px solid ${colors.primary.DEFAULT}`,
  },
  salaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text.muted,
    marginBottom: 4,
    marginTop: 0,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  salaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary.DEFAULT,
    margin: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 0,
    color: colors.text.primary,
  },
  description: {
    fontSize: 14,
    lineHeight: 1.7,
    color: colors.text.secondary,
    marginBottom: 24,
    marginTop: 0,
    whiteSpace: "pre-line" as const,
  },
  actionSection: {
    marginBottom: 24,
  },
  bottomSpacer: {
    height: 60, // Extra space at the bottom to ensure content isn't hidden
  },
  notifyCard: {
    display: "flex",
    alignItems: "center",
    backgroundColor: colors.background.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    border: `1px solid ${colors.border.light}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  notifyCardActive: {
    backgroundColor: colors.primary.DEFAULT + "08",
    borderColor: colors.primary.DEFAULT + "40",
  },
  notifyIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background.input,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  notifyTextContainer: { flex: 1 },
  notifyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 2,
    marginTop: 0,
  },
  notifySubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 1.4,
    margin: 0,
  },
  notifyToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border.DEFAULT,
    padding: 2,
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    border: "none",
    flexShrink: 0,
    transition: "background-color 0.2s",
  },
  notifyToggleActive: {
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: "flex-end",
  },
  notifyToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  notifyToggleKnobInactive: {},
  notifyToggleKnobActive: {},
  profileIncompleteContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    textAlign: "center" as const,
    border: `1px solid ${colors.border.light}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    marginTop: 0,
  },
  profileIncompleteMessage: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.secondary,
    marginBottom: 16,
    marginTop: 0,
    lineHeight: 1.5,
  },
  progressBarContainer: { width: "100%", marginBottom: 16 },
  progressBarTrack: {
    height: 10,
    backgroundColor: "#E4E7EB",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 10,
    background: `linear-gradient(90deg, ${colors.primary.start}, ${colors.primary.end})`,
    borderRadius: 5,
    transition: "width 0.4s ease",
  },
  progressBarText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: "center" as const,
    marginTop: 8,
    marginBottom: 0,
    fontWeight: "500",
  },
  completeProfileBtn: {
    background: `linear-gradient(135deg, ${colors.primary.start}, ${colors.primary.end})`,
    padding: "14px 24px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    width: "100%",
    boxShadow: `0 4px 14px ${colors.primary.DEFAULT}40`,
  },
  completeProfileBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  applyBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: `linear-gradient(135deg, ${colors.primary.start}, ${colors.primary.end})`,
    padding: 16,
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    width: "100%",
    marginTop: 0,
    boxShadow: `0 4px 14px ${colors.primary.DEFAULT}40`,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  appliedContainer: {
    backgroundColor: colors.status.success + "12",
    borderRadius: 16,
    padding: 20,
    textAlign: "center" as const,
    border: `1px solid ${colors.status.success}30`,
    marginTop: 0,
  },
  appliedBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  appliedText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.status.success,
  },
  appliedHint: { fontSize: 13, color: colors.text.muted, margin: 0 },
  modalOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  imageModalContent: {
    position: "relative" as const,
    maxWidth: "92vw",
    maxHeight: "92vh",
  },
  fullImage: {
    width: "100%",
    height: "auto",
    maxHeight: "90vh",
    objectFit: "contain" as const,
    borderRadius: 12,
  },
  closeModalBtn: {
    position: "absolute" as const,
    bottom: -44,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: 14,
  },
  applyModalContent: {
    backgroundColor: colors.background.light,
    borderRadius: 24,
    padding: "24px 20px",
    width: "92%",
    maxWidth: 480,
    maxHeight: "82vh",
    overflowY: "auto" as const,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    margin: 0,
  },
  modalCloseBtn: {
    background: colors.background.input,
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHint: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 16,
    marginTop: 4,
  },
  emptyDocs: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 20,
    textAlign: "center" as const,
    padding: "20px 0",
  },
  docList: { maxHeight: 220, overflowY: "auto" as const, marginBottom: 20 },
  docItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderRadius: 12,
    backgroundColor: colors.background.input,
    marginBottom: 8,
    border: "2px solid transparent",
  },
  docItemSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT + "08",
  },
  docItemContent: {
    flex: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  docCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    border: `2px solid ${colors.border.DEFAULT}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "#fff",
  },
  docCheckboxSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  docName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
    margin: 0,
    marginBottom: 2,
  },
  docType: { fontSize: 12, color: colors.text.muted, margin: 0 },
  viewIconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 8,
    marginLeft: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    background: `linear-gradient(135deg, ${colors.primary.start}, ${colors.primary.end})`,
    padding: 16,
    borderRadius: 14,
    textAlign: "center" as const,
    fontWeight: "700",
    fontSize: 16,
    color: "#fff",
    border: "none",
    cursor: "pointer",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: 0.3,
  },
  submitBtnDisabled: { opacity: 0.65, cursor: "not-allowed" },
};

export default OpportunityDetailPage;