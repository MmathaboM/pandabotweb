// src/pages/MyOpportunitiesPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { opportunitiesService } from "../../services/opportunitiesService";
import {
  ApplicationDetail,
  ApplicationStats,
} from "../../services/opportunitiesService";
import { Assessment as AssessmentType } from "../../types/assessment";
import ApplicationDetailPage from "./ApplicationDetailsPage";
import AssessmentView from "./AssessmentView";
import PageHeader from "../../components/PageHeader";

interface MyOpportunitiesPageProps {
  onBack: () => void;
  onNavigate?: (path: string) => void;
}

type TabType = "applications" | "assessments";
type DisplayStatus =
  | "pending"
  | "reviewing"
  | "shortlisted"
  | "interviewed"
  | "accepted"
  | "rejected"
  | "onboarding"
  | "completed"
  | "unsuccessful";

const STATUS_CONFIG: Record<
  DisplayStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: "Pending", color: "#f59e0b", icon: Clock },
  reviewing: { label: "Reviewing", color: "#3b82f6", icon: Clock },
  shortlisted: { label: "Shortlisted", color: "#3b82f6", icon: CheckCircle },
  interviewed: { label: "Interviewed", color: "#10b981", icon: CheckCircle },
  accepted: { label: "Accepted", color: "#10b981", icon: CheckCircle },
  rejected: { label: "Rejected", color: "#ef4444", icon: XCircle },
  onboarding: { label: "Onboarding", color: "#3b82f6", icon: Clock },
  completed: { label: "Completed", color: "#10b981", icon: CheckCircle },
  unsuccessful: { label: "Unsuccessful", color: "#ef4444", icon: XCircle },
};

function isClosedOverTwoWeeks(closingDate?: string | null): boolean {
  if (!closingDate) return false;
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  return new Date(closingDate) < twoWeeksAgo;
}

function getStatusMessage(
  status: string,
  closingDate?: string | null,
): string | null {
  if (status === "pending" && isClosedOverTwoWeeks(closingDate)) {
    return "No longer under consideration. The opportunity has closed.";
  }
  switch (status) {
    case "pending":
      return "We're still reviewing applications. If you haven't heard from us within two weeks, your application was unfortunately unsuccessful.";
    case "reviewing":
      return "Your application is currently being reviewed by our team.";
    case "shortlisted":
      return "Congratulations! You've been shortlisted. We'll be in touch soon with next steps.";
    case "interviewed":
      return "Thank you for attending the interview. We're reviewing your application.";
    case "accepted":
      return "Congratulations! Your application has been accepted. Welcome aboard!";
    case "rejected":
      return "Unfortunately, your application was not successful this time. Don't give up - keep applying!";
    case "onboarding":
      return "Welcome! Your onboarding process has started. Check your email for next steps.";
    case "completed":
      return "You've successfully completed the process! We're excited to have you on the team.";
    default:
      return null;
  }
}

function ApplicationCard({
  application,
  onPress,
}: {
  application: ApplicationDetail;
  onPress: () => void;
}) {
  let displayStatus = application.status as DisplayStatus;
  const isClosed = isClosedOverTwoWeeks(application.opportunity?.closing_date);
  if (application.status === "pending" && isClosed)
    displayStatus = "unsuccessful";
  const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const statusMessage = getStatusMessage(
    application.status,
    application.opportunity?.closing_date,
  );
  const hasInterview = !!application.interview_scheduled_at;
  const isUpcoming =
    hasInterview && new Date(application.interview_scheduled_at!) > new Date();
  const hasPassed =
    hasInterview && new Date(application.interview_scheduled_at!) < new Date();

  return (
    <button className="mo-card" onClick={onPress}>
      <div className="mo-card-header">
        <div className="mo-card-icon">
          <Briefcase size={20} color="var(--primary)" />
        </div>
        <div className="mo-card-header-text">
          <div className="mo-card-title">{application.opportunity.title}</div>
          <div className="mo-applied-date">
            Applied {new Date(application.applied_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="mo-card-footer">
        <div
          className="mo-status-badge"
          style={{ backgroundColor: config.color + "20" }}
        >
          <StatusIcon size={14} color={config.color} />
          <span style={{ color: config.color }}>{config.label}</span>
        </div>
        {hasInterview && (
          <div className="mo-interview-badge">
            <Calendar
              size={12}
              color={isUpcoming ? "var(--primary)" : "var(--text-muted)"}
            />
            <span
              style={{
                color: isUpcoming ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {isUpcoming
                ? "Interview Soon"
                : hasPassed
                  ? "Interview Passed"
                  : "Interview Scheduled"}
            </span>
          </div>
        )}
      </div>
      {statusMessage && (
        <div className="mo-message-container">
          <div className="mo-message-text">{statusMessage}</div>
        </div>
      )}
    </button>
  );
}

function AssessmentCard({
  assessment,
  onPress,
}: {
  assessment: AssessmentType;
  onPress: () => void;
}) {
  const getStatusConfig = () => {
    if (assessment.status === "completed") {
      return {
        label: assessment.passed ? "Passed" : "Failed",
        color: assessment.passed ? "#10b981" : "#ef4444",
        icon: assessment.passed ? CheckCircle : XCircle,
      };
    }
    if (assessment.status === "in_progress")
      return { label: "In Progress", color: "#3b82f6", icon: Clock };
    return { label: "Not Started", color: "#f59e0b", icon: FileText };
  };
  const config = getStatusConfig();
  const StatusIcon = config.icon;
  return (
    <button className="mo-card" onClick={onPress}>
      <div className="mo-card-header">
        <div className="mo-card-icon">
          <FileText size={20} color="var(--primary)" />
        </div>
        <div className="mo-card-header-text">
          <div className="mo-card-title">{assessment.title}</div>
          <div className="mo-applied-date">
            {assessment.duration_minutes} minutes •{" "}
            {assessment.due_date
              ? `Due ${new Date(assessment.due_date).toLocaleDateString()}`
              : "No deadline"}
          </div>
        </div>
      </div>
      <div className="mo-card-footer">
        <div
          className="mo-status-badge"
          style={{ backgroundColor: config.color + "20" }}
        >
          <StatusIcon size={14} color={config.color} />
          <span style={{ color: config.color }}>{config.label}</span>
        </div>
        {assessment.score !== undefined && assessment.max_score && (
          <div className="mo-score-badge">
            Score: {assessment.score}/{assessment.max_score}
          </div>
        )}
      </div>
    </button>
  );
}

export default function MyOpportunitiesPage({
  onBack,
  onNavigate,
}: MyOpportunitiesPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("applications");
  const [applications, setApplications] = useState<ApplicationDetail[]>([]);
  const [assessments, setAssessments] = useState<AssessmentType[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<{
    id: number;
    opportunityId: number;
  } | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      const data = await opportunitiesService.getMyApplications();
      const detailedApps = await Promise.all(
        data.map(async (app) => {
          try {
            return await opportunitiesService.getApplicationDetails(app.id);
          } catch {
            return null;
          }
        }),
      );
      const validApps = detailedApps.filter(
        (app): app is ApplicationDetail => app !== null,
      );
      setApplications(validApps);
      const appStats = await opportunitiesService.getMyApplicationStats();
      setStats(appStats);
    } catch (error) {
      console.error("Failed to load applications:", error);
    }
  }, []);

  const loadAssessments = useCallback(async () => {
    setIsLoadingAssessments(true);
    try {
      const data = await opportunitiesService.getMyAssessments();
      setAssessments(data);
    } catch (error) {
      console.error("Failed to load assessments:", error);
    } finally {
      setIsLoadingAssessments(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "applications") {
      loadApplications().finally(() => setIsLoading(false));
    } else {
      loadAssessments().finally(() => setIsLoading(false));
    }
  }, [activeTab, loadApplications, loadAssessments]);

  // Show application details page if an application is selected
  if (selectedAppId !== null) {
    return (
      <ApplicationDetailPage
        applicationId={selectedAppId}
        onBack={() => setSelectedAppId(null)}
        onNavigate={onNavigate}
      />
    );
  }

  // Show assessment view if an assessment is selected
  if (selectedAssessment !== null) {
    return (
      <AssessmentView
        assessmentId={selectedAssessment.id}
        opportunityId={selectedAssessment.opportunityId}
        onBack={() => {
          setSelectedAssessment(null);
          loadAssessments(); // refresh list in case status changed
        }}
      />
    );
  }

  // FIX: re‑compute pending count using the same logic
  const pendingCount = applications.filter(
    (a) =>
      a.status === "pending" &&
      !isClosedOverTwoWeeks(a.opportunity?.closing_date),
  ).length;

  return (
    <>
      <style>{CSS}</style>
      <div className="mo-root">
        {/* ─── Fixed Header ─── */}
        <PageHeader title="My Applications" onBack={onBack} />

        {/* ─── Scrollable Content ─── */}
        <div className="mo-scroll">
          <div className="mo-tab-container">
            <button
              className={`mo-tab ${activeTab === "applications" ? "mo-tab-active" : ""}`}
              onClick={() => setActiveTab("applications")}
            >
              <Briefcase
                size={18}
                color={
                  activeTab === "applications" ? "var(--primary)" : "#4a4a4a"
                }
              />
              <span>Applications ({applications.length})</span>
            </button>
            <button
              className={`mo-tab ${activeTab === "assessments" ? "mo-tab-active" : ""}`}
              onClick={() => setActiveTab("assessments")}
            >
              <FileText
                size={18}
                color={
                  activeTab === "assessments" ? "var(--primary)" : "#4a4a4a"
                }
              />
              <span>Assessments ({assessments.length})</span>
            </button>
          </div>

          {/* {activeTab === "applications" && stats && (
            <div className="mo-stats-card">
              <div className="mo-stat-item">
                <div className="mo-stat-value">{stats.total || 0}</div>
                <div className="mo-stat-label">Total</div>
              </div>
              <div className="mo-stat-divider" />
              <div className="mo-stat-item">
                <div className="mo-stat-value" style={{ color: "#f59e0b" }}>
                  {pendingCount}
                </div>
                <div className="mo-stat-label">Pending</div>
              </div>
              <div className="mo-stat-divider" />
              <div className="mo-stat-item">
                <div className="mo-stat-value" style={{ color: "#3b82f6" }}>
                  {stats.reviewing || 0}
                </div>
                <div className="mo-stat-label">Reviewing</div>
              </div>
              <div className="mo-stat-divider" />
              <div className="mo-stat-item">
                <div className="mo-stat-value" style={{ color: "#3b82f6" }}>
                  {stats.shortlisted || 0}
                </div>
                <div className="mo-stat-label">Shortlisted</div>
              </div>
              <div className="mo-stat-divider" />
              <div className="mo-stat-item">
                <div className="mo-stat-value" style={{ color: "#10b981" }}>
                  {stats.interviewed || 0}
                </div>
                <div className="mo-stat-label">Interviewed</div>
              </div>
            </div>
          )} */}

          {isLoading ? (
            <div className="mo-loading">Loading...</div>
          ) : activeTab === "applications" ? (
            applications.length === 0 ? (
              <div className="mo-empty">
                <Briefcase size={48} className="mo-empty-icon" />
                <div className="mo-empty-title">No Applications Yet</div>
                <div className="mo-empty-subtitle">
                  Browse opportunities and apply to track them here
                </div>
                <button
                  className="mo-browse-btn"
                  onClick={() => onNavigate?.("/dashboard/opportunities")}
                >
                  Browse Opportunities
                </button>
              </div>
            ) : (
              <div className="mo-list">
                {applications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onPress={() => setSelectedAppId(app.id)}
                  />
                ))}
              </div>
            )
          ) : isLoadingAssessments ? (
            <div className="mo-loading">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="mo-empty">
              <FileText size={48} className="mo-empty-icon" />
              <div className="mo-empty-title">No Assessments Yet</div>
              <div className="mo-empty-subtitle">
                When you apply for opportunities that require assessments, they
                will appear here.
              </div>
            </div>
          ) : (
            <div className="mo-list">
              {assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  onPress={() =>
                    setSelectedAssessment({
                      id: assessment.id,
                      opportunityId: assessment.opportunity_id!,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
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
  }

  /* ── Fixed overlay container ── */
  .mo-root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* ── Scrollable content ── */
  .mo-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 0 80px;
  }

  .mo-tab-container {
    display: flex;
    gap: 12px;
    padding: 16px 16px 8px;
    background: var(--bg);
  }

  .mo-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background: var(--card-bg);
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #4a4a4a;
    transition: all 0.2s;
  }
  .mo-tab-active {
    background: var(--primary-light);
    border: 1px solid var(--primary);
    color: var(--primary);
  }

  .mo-stats-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    background: var(--card-bg);
    margin: 8px 16px 12px;
    padding: 16px;
    border-radius: 12px;
  }
  .mo-stat-item {
    flex: 1;
    min-width: 60px;
    text-align: center;
  }
  .mo-stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .mo-stat-label {
    font-size: 10px;
    color: #4a4a4a;
    margin-top: 2px;
  }
  .mo-stat-divider {
    width: 1px;
    height: 32px;
    background: var(--divider);
  }

  .mo-loading {
    text-align: center;
    padding: 40px;
    color: var(--text-muted);
  }

  .mo-list {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mo-card {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    transition: transform 0.1s;
    text-align: left;
    width: 100%;
    border: none;
    cursor: pointer;
  }
  .mo-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .mo-card-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .mo-card-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .mo-card-header-text {
    flex: 1;
  }
  .mo-card-title {
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
    margin-bottom: 4px;
  }
  .mo-applied-date {
    font-size: 12px;
    color: #4a4a4a;
  }

  .mo-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--divider);
  }
  .mo-status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
  }
  .mo-interview-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
  }
  .mo-score-badge {
    font-size: 13px;
    font-weight: 500;
    color: var(--primary);
  }

  .mo-message-container {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--divider);
  }
  .mo-message-text {
    font-size: 13px;
    color: #666;
    line-height: 1.4;
  }

  .mo-empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
  }
  .mo-empty-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }
  .mo-empty-title {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 16px 0 8px;
  }
  .mo-empty-subtitle {
    font-size: 14px;
    color: #4a4a4a;
    margin-bottom: 24px;
  }
  .mo-browse-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
  }
`;
