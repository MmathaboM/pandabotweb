import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { opportunitiesService } from "../../services/opportunitiesService";
import AssessmentView from "./AssessmentView";
import type { Assessment } from "../../types/assessment";

interface AssessmentsPageProps {
  onBack: () => void;
}

export default function AssessmentsPage({ onBack }: AssessmentsPageProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<{
    id: number;
    opportunityId: number;
  } | null>(null);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      const data = await opportunitiesService.getMyAssessments();
      setAssessments(data);
    } catch (error) {
      console.error("Failed to load assessments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: Assessment["status"], passed?: boolean) => {
    if (status === "completed")
      return {
        label: passed ? "Passed" : "Failed",
        color: passed ? "#10b981" : "#ef4444",
        icon: passed ? CheckCircle : XCircle,
      };
    if (status === "in_progress")
      return { label: "In Progress", color: "#3b82f6", icon: Clock };
    return { label: "Not Started", color: "#f59e0b", icon: FileText };
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (selectedAssessment) {
    return (
      <AssessmentView
        assessmentId={selectedAssessment.id}
        opportunityId={selectedAssessment.opportunityId}
        onBack={() => {
          setSelectedAssessment(null);
          loadAssessments();
        }}
      />
    );
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div className="ap-page">
        <div className="ap-header">
          <button className="ap-back-btn" onClick={onBack}>
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="ap-title">My Assessments</h1>
          <div className="ap-placeholder" />
        </div>

        <div className="ap-content">
          {isLoading ? (
            <div className="ap-loading">
              <Loader2 size={32} className="ap-spinner" />
              <p>Loading your assessments...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">
                <FileText size={64} />
              </div>
              <h3>No Assessments Yet</h3>
              <p>
                When you apply for opportunities that require assessments,
                they'll appear here.
              </p>
            </div>
          ) : (
            <div className="ap-grid">
              {assessments.map((assessment) => {
                const config = getStatusConfig(
                  assessment.status,
                  assessment.passed,
                );
                const StatusIcon = config.icon;
                return (
                  <button
                    key={`${assessment.id}-${assessment.opportunity_id}`}
                    className="ap-card"
                    onClick={() =>
                      setSelectedAssessment({
                        id: assessment.id,
                        opportunityId: assessment.opportunity_id!,
                      })
                    }
                  >
                    <div className="ap-card-header">
                      <div className="ap-card-icon">
                        <FileText size={24} />
                      </div>
                      <div
                        className="ap-card-status"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <StatusIcon size={14} color={config.color} />
                        <span style={{ color: config.color }}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                    <div className="ap-card-body">
                      <h3 className="ap-card-title">{assessment.title}</h3>
                      <p className="ap-card-description">
                        {assessment.description || "No description provided."}
                      </p>
                      <div className="ap-card-meta">
                        <div className="ap-meta-item">
                          <Clock size={14} />
                          <span>
                            {formatDuration(assessment.duration_minutes)}
                          </span>
                        </div>
                        {assessment.due_date && (
                          <div className="ap-meta-item">
                            <span>
                              Due{" "}
                              {new Date(
                                assessment.due_date,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {assessment.max_score && (
                          <div className="ap-meta-item">
                            <span>
                              Score: {assessment.score ?? 0}/
                              {assessment.max_score}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const globalStyles = `
  :root {
    --primary: #fb8500;
    --primary-dark: #e07600;
    --primary-light: rgba(251, 133, 0, 0.12);
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --border: #e2e8f0;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    --radius: 1rem;
  }

  .ap-page {
    min-height: 100vh;
    background: var(--bg);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
  }

  .ap-header {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    padding: 2rem 1.5rem 2rem;
    border-bottom-left-radius: 1.75rem;
    border-bottom-right-radius: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow-lg);
  }

  .ap-back-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
  }

  .ap-back-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-2px);
  }

  .ap-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    letter-spacing: -0.01em;
  }

  .ap-placeholder {
    width: 80px;
  }

  .ap-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .ap-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 4rem 1rem;
    color: var(--text-muted);
  }

  .ap-spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ap-empty {
    text-align: center;
    padding: 4rem 1rem;
    background: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    max-width: 32rem;
    margin: 0 auto;
  }

  .ap-empty-icon {
    background: var(--primary-light);
    width: 96px;
    height: 96px;
    margin: 0 auto 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3rem;
    color: var(--primary);
  }

  .ap-empty h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }

  .ap-empty p {
    color: var(--text-secondary);
    margin: 0;
  }

  .ap-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .ap-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .ap-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .ap-card {
    background: var(--card-bg);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    padding: 1.25rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-sm);
    width: 100%;
  }

  .ap-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-light);
  }

  .ap-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .ap-card-icon {
    background: var(--primary-light);
    width: 48px;
    height: 48px;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
  }

  .ap-card-status {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    border-radius: 2rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .ap-card-body {
    margin-top: 0.5rem;
  }

  .ap-card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
    line-height: 1.4;
  }

  .ap-card-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0 0 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ap-card-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .ap-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
`;
