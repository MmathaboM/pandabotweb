// src/components/profile/ApplicationDetailPage.tsx
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { opportunitiesService } from "../../services/opportunitiesService";
import type { ApplicationDetail, InterviewDetails } from "../../services/opportunitiesService";

interface ApplicationDetailPageProps {
  applicationId: number;
  onBack: () => void;
  onNavigate?: (path: string) => void;
}

function formatDate(date: string | null) {
  if (!date) return "Not scheduled";
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: "#f59e0b",
    reviewing: "#3b82f6",
    shortlisted: "#3b82f6",
    interviewed: "#10b981",
    accepted: "#10b981",
    rejected: "#ef4444",
    onboarding: "#3b82f6",
    completed: "#10b981",
  };
  const color = statusColors[status] || "#6b7280";
  return (
    <span
      className="app-status-badge"
      style={{ backgroundColor: color + "20", color }}
    >
      {status}
    </span>
  );
}

export default function ApplicationDetailPage({
  applicationId,
  onBack,
}: ApplicationDetailPageProps) {
  const [application, setApplication] = useState<ApplicationDetail | null>(
    null,
  );
  const [interview, setInterview] = useState<InterviewDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [applicationId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appData, interviewData] = await Promise.all([
        opportunitiesService.getApplicationDetails(applicationId),
        opportunitiesService
          .getInterviewDetails(applicationId)
          .catch(() => null),
      ]);
      setApplication(appData);
      setInterview(interviewData);
    } catch (error) {
      console.error("Failed to load application details:", error);
      alert("Failed to load application details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAttendance = async (willAttend: boolean) => {
    setIsConfirming(true);
    try {
      await opportunitiesService.confirmInterview(applicationId, willAttend);
      setConfirmationResult({
        success: true,
        message: willAttend
          ? "✓ Interview confirmed! Good luck with your interview."
          : "✗ Interview declined. We've notified the recruiter.",
      });
      setShowSuccessModal(true);
      setTimeout(() => loadData(), 2000);
    } catch (error: any) {
      console.error("Failed to confirm interview:", error);
      alert(error?.response?.data?.message || "Failed to confirm interview.");
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="app-root">
          <div className="app-loader">Loading application details...</div>
        </div>
      </>
    );
  }

  if (!application) {
    return (
      <>
        <style>{CSS}</style>
        <div className="app-root">
          <div className="app-error">
            <p>Application not found</p>
            <button onClick={onBack} className="app-error__btn">
              Go Back
            </button>
          </div>
        </div>
      </>
    );
  }

  const hasInterview = interview && interview.interview_location;
  const isUpcoming = interview?.is_upcoming === true;
  const canConfirm =
    isUpcoming &&
    (application.status === "reviewing" || application.status === "pending");

  return (
    <>
      <style>{CSS}</style>
      <div className="app-root">
        <div className="app-header">
          <button className="app-back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h2 className="app-header__title">Application Details</h2>
        </div>

        <div className="app-body">
          {/* Opportunity Card */}
          <div className="app-card app-card--opportunity">
            <div className="app-opportunity-icon">
              <Briefcase size={24} color="var(--primary)" />
            </div>
            <div>
              <h3 className="app-opportunity__title">
                {application.opportunity.title}
              </h3>
              <StatusBadge status={application.status} />
            </div>
          </div>

          {/* Interview Section */}
          {hasInterview && (
            <div className="app-section">
              <h3 className="app-section__title">Interview Details</h3>
              <div className="app-card">
                <div className="app-info-row">
                  <Calendar size={20} className="app-info-icon" />
                  <div>
                    <div className="app-info-label">Date & Time</div>
                    <div className="app-info-value">
                      {interview.interview_date_formatted} at{" "}
                      {interview.interview_time_formatted}
                    </div>
                  </div>
                </div>
                <div className="app-divider" />
                <div className="app-info-row">
                  <MapPin size={20} className="app-info-icon" />
                  <div>
                    <div className="app-info-label">Location</div>
                    <div className="app-info-value">
                      {interview.interview_location}
                    </div>
                  </div>
                </div>

                {canConfirm && (
                  <div className="app-button-group">
                    <button
                      className="app-btn app-btn--primary"
                      onClick={() => handleConfirmAttendance(true)}
                      disabled={isConfirming}
                    >
                      {isConfirming ? (
                        <div className="app-spinner-small" />
                      ) : (
                        <>
                          <CheckCircle size={18} /> Confirm Attendance
                        </>
                      )}
                    </button>
                    <button
                      className="app-btn app-btn--secondary"
                      onClick={() => handleConfirmAttendance(false)}
                      disabled={isConfirming}
                    >
                      <XCircle size={18} /> Cannot Attend
                    </button>
                  </div>
                )}

                {interview.has_passed && application.status === "reviewing" && (
                  <div className="app-message app-message--info">
                    <Clock size={20} />{" "}
                    <p>
                      Your interview has passed. The recruiter will update your
                      status soon.
                    </p>
                  </div>
                )}

                {application.status === "interviewed" && (
                  <div className="app-message app-message--success">
                    <CheckCircle size={20} />{" "}
                    <p>
                      Interview completed! We're reviewing your application.
                    </p>
                  </div>
                )}

                {interview.message && !canConfirm && (
                  <div className="app-interview-message">
                    {interview.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recruiter Notes */}
          {application.latest_notes && application.latest_notes.length > 0 && (
            <div className="app-section">
              <h3 className="app-section__title">Recruiter Notes</h3>
              {application.latest_notes.map((note) => (
                <div key={note.id} className="app-note-card">
                  <div className="app-note-header">
                    <MessageSquare size={14} />
                    <span>{note.created_at_formatted}</span>
                  </div>
                  <div className="app-note-text">{note.note}</div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className="app-section">
            <h3 className="app-section__title">Application Timeline</h3>
            <div className="app-card">
              <div className="app-timeline-item">
                <div className="app-timeline-dot" />
                <div>
                  <div className="app-timeline-title">
                    Application Submitted
                  </div>
                  <div className="app-timeline-date">
                    {formatDate(application.applied_at)}
                  </div>
                </div>
              </div>
              {application.invited_to_interview_at && (
                <div className="app-timeline-item">
                  <div className="app-timeline-dot" />
                  <div>
                    <div className="app-timeline-title">
                      Interview Invitation Sent
                    </div>
                    <div className="app-timeline-date">
                      {formatDate(application.invited_to_interview_at)}
                    </div>
                  </div>
                </div>
              )}
              {application.interview_scheduled_at && (
                <div className="app-timeline-item">
                  <div className="app-timeline-dot" />
                  <div>
                    <div className="app-timeline-title">
                      Interview Scheduled
                    </div>
                    <div className="app-timeline-date">
                      {formatDate(application.interview_scheduled_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className="app-modal-overlay"
          onClick={() => setShowSuccessModal(false)}
        >
          <div className="app-modal" onClick={(e) => e.stopPropagation()}>
            {confirmationResult?.success ? (
              <>
                {confirmationResult.message.includes("confirmed") ? (
                  <CheckCircle size={48} className="app-modal-icon success" />
                ) : (
                  <XCircle size={48} className="app-modal-icon error" />
                )}
                <h3 className="app-modal-title">
                  {confirmationResult.message.includes("confirmed")
                    ? "Confirmed!"
                    : "Declined"}
                </h3>
                <div className="app-modal-message">
                  {confirmationResult.message}
                </div>
              </>
            ) : (
              <>
                <div className="app-spinner" />
                <div>Processing...</div>
              </>
            )}
            <button
              className="app-modal-btn"
              onClick={() => {
                setShowSuccessModal(false);
                if (confirmationResult?.success) loadData();
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

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
    --success: #10b981;
  }
  .app-root { background: var(--bg); min-height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .app-header { background: linear-gradient(135deg, #fb8500, #f5a623); padding: 48px 24px 32px; position: relative; border-bottom-left-radius: 28px; border-bottom-right-radius: 28px; display: flex; align-items: center; justify-content: space-between; }
  .app-back-btn { background: none; border: none; color: white; display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 500; cursor: pointer; }
  .app-header__title { margin: 0; font-size: 20px; font-weight: 700; color: #fff; text-align: center; }
  .app-body { padding: 20px 16px 40px; }
  .app-loader, .app-error { text-align: center; padding: 60px 20px; color: var(--text-muted); }
  .app-error__btn { margin-top: 16px; background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 12px; cursor: pointer; }
  .app-card { background: var(--card-bg); border-radius: var(--radius-card); padding: 16px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .app-card--opportunity { display: flex; align-items: center; gap: 12px; }
  .app-opportunity-icon { width: 48px; height: 48px; background: var(--primary-light); border-radius: var(--radius-icon); display: flex; align-items: center; justify-content: center; }
  .app-opportunity__title { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: var(--text-primary); }
  .app-status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
  .app-section { margin-bottom: 24px; }
  .app-section__title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 12px 4px; }
  .app-info-row { display: flex; gap: 12px; }
  .app-info-icon { color: var(--primary); flex-shrink: 0; }
  .app-info-label { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
  .app-info-value { font-size: 14px; font-weight: 500; color: var(--text-primary); }
  .app-divider { height: 1px; background: var(--divider); margin: 12px 0; }
  .app-button-group { display: flex; gap: 12px; margin-top: 16px; }
  .app-btn { flex: 1; padding: 12px; border-radius: 12px; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: opacity 0.15s; }
  .app-btn--primary { background: var(--primary); color: white; }
  .app-btn--secondary { background: var(--divider); color: var(--danger); }
  .app-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .app-message { display: flex; gap: 12px; padding: 12px; border-radius: 12px; margin-top: 16px; }
  .app-message--info { background: rgba(59,130,246,0.1); color: #3b82f6; }
  .app-message--success { background: rgba(16,185,129,0.1); color: var(--success); }
  .app-interview-message { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--divider); font-size: 13px; color: var(--text-muted); }
  .app-note-card { background: var(--card-bg); border-radius: 12px; padding: 12px; margin-bottom: 8px; }
  .app-note-header { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 11px; margin-bottom: 8px; }
  .app-note-text { font-size: 14px; color: var(--text-primary); }
  .app-timeline-item { display: flex; gap: 12px; margin-bottom: 16px; }
  .app-timeline-dot { width: 8px; height: 8px; background: var(--primary); border-radius: 50%; margin-top: 4px; }
  .app-timeline-title { font-weight: 500; font-size: 14px; color: var(--text-primary); }
  .app-timeline-date { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  .app-spinner-small { width: 18px; height: 18px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; }
  .app-spinner { width: 32px; height: 32px; border: 3px solid var(--divider); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .app-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .app-modal { background: white; border-radius: 24px; padding: 24px; max-width: 300px; width: 80%; text-align: center; }
  .app-modal-icon { margin: 0 auto 12px; }
  .app-modal-icon.success { color: var(--success); }
  .app-modal-icon.error { color: var(--danger); }
  .app-modal-title { font-size: 20px; font-weight: 700; margin: 8px 0 4px; }
  .app-modal-message { font-size: 14px; color: var(--text-muted); margin: 8px 0 16px; }
  .app-modal-btn { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; }
`;
