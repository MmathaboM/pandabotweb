import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Send,
  AlertCircle,
} from "lucide-react";
import { opportunitiesService } from "../../services/opportunitiesService";
import type {
  Assessment,
  AssessmentQuestion,
  AssessmentResult,
} from "../../types/assessment";

// Local type matching the actual API response for questions
interface ApiQuestion {
  id: number;
  question_text: string;
  type: "multiple_choice" | "text" | "single_choice";
  options?: Array<{
    id: number;
    option_text: string;
    assessment_question_id?: number;
  }>;
  points: number;
}

interface AssessmentViewProps {
  assessmentId: number;
  opportunityId: number;
  onBack: () => void;
  onComplete?: () => void;
}

type ViewState = "loading" | "taking" | "submitting" | "result";

const DEFAULT_PASS_SCORE = 70;
const DEFAULT_TIME_LIMIT_MINUTES = 30; // fallback if API doesn't provide time

export default function AssessmentView({
  assessmentId,
  opportunityId,
  onBack,
  onComplete,
}: AssessmentViewProps) {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        const data = await opportunitiesService.getAssessmentDetails(
          assessmentId,
          opportunityId,
        );
        const typedData = data as Assessment & { questions?: ApiQuestion[] };
        setAssessment(typedData);

        if (typedData.status === "completed" && typedData.score !== undefined) {
          const resultData: AssessmentResult = {
            assessment_id: typedData.id,
            title: typedData.title,
            score: typedData.score,
            max_score: typedData.max_score || typedData.score,
            percentage: typedData.max_score
              ? Math.round((typedData.score / typedData.max_score) * 100)
              : 0,
            passed: typedData.passed || false,
            completed_at: typedData.completed_at || new Date().toISOString(),
          };
          setResult(resultData);
          setViewState("result");
        } else {
          setViewState("taking");
          // Try both possible fields and fallback to default
          let minutes = typedData.duration_minutes;
          if (!minutes) {
            // @ts-ignore – fallback to time_limit_minutes if it exists (old API)
            minutes = typedData.time_limit_minutes;
          }
          if (minutes) {
            setTimeLeft(minutes * 60);
          } else {
            // If no time limit provided, set a default
            setTimeLeft(DEFAULT_TIME_LIMIT_MINUTES * 60);
          }
        }
      } catch (err) {
        setError("Failed to load assessment");
        console.error(err);
      }
    };
    loadAssessment();
  }, [assessmentId, opportunityId]);

  // Timer countdown – stable interval
  useEffect(() => {
    if (viewState !== "taking" || timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [viewState]); // only depend on viewState, not timeLeft

  const handleAutoSubmit = () => {
    if (viewState === "taking" && assessment) {
      handleSubmit();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOptionSelect = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!assessment?.questions) return;
    setViewState("submitting");
    try {
      const allAnswered = assessment.questions.every(
        (q) => answers[q.id] !== undefined,
      );
      if (!allAnswered) {
        setError("Please answer all questions before submitting.");
        setViewState("taking");
        return;
      }

      const response = await opportunitiesService.submitAssessment(
        assessmentId,
        opportunityId,
        answers,
      );
      setResult(response.result);
      setViewState("result");
      onComplete?.();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit assessment");
      setViewState("taking");
    }
  };

  const answeredCount = assessment?.questions
    ? assessment.questions.filter((q) => answers[q.id] !== undefined).length
    : 0;
  const totalQuestions = assessment?.questions?.length ?? 0;
  const progressPct =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // Render a question
  const renderQuestion = (question: ApiQuestion, index: number) => {
    const selectedOptionId = answers[question.id];
    return (
      <div key={question.id} className="av-question">
        <div className="av-question-header">
          <span className="av-question-number">
            Question {index + 1} of {totalQuestions}
          </span>
          <span className="av-question-points">
            {question.points} {question.points === 1 ? "pt" : "pts"}
          </span>
        </div>
        <div className="av-question-text">{question.question_text}</div>
        <div className="av-options">
          {question.options?.map((option) => (
            <label
              key={option.id}
              className={`av-option${
                selectedOptionId === option.id ? " av-option-selected" : ""
              }`}
            >
              <input
                type="radio"
                name={`q_${question.id}`}
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => handleOptionSelect(question.id, option.id)}
              />
              <span className="av-option-dot" />
              <span>{option.option_text}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    const isPassed = result.passed;
    const percentage = result.percentage;
    return (
      <div className="av-result">
        <div
          className={`av-result-hero ${
            isPassed ? "av-result-passed" : "av-result-failed"
          }`}
        >
          <div className="av-result-icon">
            {isPassed ? <CheckCircle size={40} /> : <XCircle size={40} />}
          </div>
          <h2>{isPassed ? "You passed!" : "Assessment complete"}</h2>
          <p>
            {isPassed
              ? "Great work — you've met the pass threshold."
              : "You didn't pass this time. Retry if allowed."}
          </p>
        </div>

        <div className="av-score-card">
          <div className="av-score-row">
            <div className="av-score-block">
              <span className="av-score-label">Score</span>
              <span className="av-score-value">
                {result.score} / {result.max_score}
              </span>
            </div>
            <div className="av-score-divider" />
            <div className="av-score-block">
              <span className="av-score-label">Percentage</span>
              <span
                className={`av-score-pct ${
                  isPassed ? "av-pct-pass" : "av-pct-fail"
                }`}
              >
                {percentage}%
              </span>
            </div>
          </div>
          <div className="av-score-bar-track">
            <div
              className={`av-score-bar-fill ${
                isPassed ? "av-bar-pass" : "av-bar-fail"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="av-score-hint">Pass threshold: {DEFAULT_PASS_SCORE}%</p>
        </div>

        <div className="av-actions">
          <button onClick={onBack} className="av-ghost-btn">
            <ArrowLeft size={16} /> Back to assessments
          </button>
        </div>
      </div>
    );
  };

  // ─── Render states ───────────────────────────────────────────────

  if (error) {
    return (
      <>
        <style>{assessmentViewCSS}</style>
        <div className="av-state-screen av-error-screen">
          <div className="av-state-icon av-state-icon-error">
            <AlertCircle size={28} />
          </div>
          <p className="av-state-title">Something went wrong</p>
          <p className="av-state-sub">{error}</p>
          <button onClick={onBack} className="av-ghost-btn">
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
      </>
    );
  }

  if (viewState === "loading") {
    return (
      <>
        <style>{assessmentViewCSS}</style>
        <div className="av-state-screen">
          <div className="av-spinner" />
          <p className="av-state-sub">Loading assessment…</p>
        </div>
      </>
    );
  }

  if (viewState === "result" && result) {
    return (
      <>
        <style>{assessmentViewCSS}</style>
        <div className="av-container">
          <div className="av-header">
            <button onClick={onBack} className="av-ghost-btn av-ghost-btn-sm">
              <ArrowLeft size={18} /> Back
            </button>
            <h1 className="av-title">{assessment?.title}</h1>
          </div>
          {renderResult()}
        </div>
      </>
    );
  }

  if ((viewState === "taking" || viewState === "submitting") && assessment) {
    const isSubmitting = viewState === "submitting";
    const questions = assessment.questions as ApiQuestion[] | undefined;
    return (
      <>
        <style>{assessmentViewCSS}</style>
        <div className="av-container">
          <div className="av-header">
            <button onClick={onBack} className="av-ghost-btn av-ghost-btn-sm">
              <ArrowLeft size={18} /> Back
            </button>
            <h1 className="av-title">{assessment.title}</h1>
            {/* Timer always rendered if timeLeft is not null – now it will be set */}
            {timeLeft !== null && (
              <div
                className={`av-timer${timeLeft < 60 ? " av-timer-urgent" : ""}`}
              >
                <Clock size={15} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          <div className="av-meta-bar">
            <span>{assessment.description}</span>
            <span className="av-meta-pills">
              <span className="av-pill">Pass: {DEFAULT_PASS_SCORE}%</span>
              <span className="av-pill">
                {questions?.length ?? 0} questions
              </span>
            </span>
          </div>

          <div className="av-progress-wrap">
            <div className="av-progress-track">
              <div
                className="av-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="av-progress-label">
              {answeredCount} / {totalQuestions} answered
            </span>
          </div>

          <div className="av-questions">
            {questions?.map((q, idx) => renderQuestion(q, idx))}
          </div>

          <div className="av-actions">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="av-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="av-btn-spinner" /> Submitting…
                </>
              ) : (
                <>
                  <Send size={16} /> Submit assessment
                </>
              )}
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}

// ─── CSS styles (unchanged) ────────────────────────────────────────────

export const assessmentViewCSS = `
  /* ── Layout ── */
  .av-container {
    max-width: 760px;
    margin: 0 auto;
    padding: 24px 20px 48px;
  }

  /* ── Header ── */
  .av-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .av-title {
    flex: 1;
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1F2933;
    line-height: 1.3;
  }

  /* ── Ghost button (back / secondary) ── */
  .av-ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    color: #4a5568;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 14px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .av-ghost-btn:hover {
    background: #f7f8fa;
    border-color: #c4cdd8;
    color: #1F2933;
  }
  .av-ghost-btn-sm {
    padding: 6px 12px;
    font-size: 13px;
  }

  /* ── Timer ── */
  .av-timer {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f1f5f9;
    border: 1.5px solid #e2e8f0;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 14px;
    font-weight: 600;
    color: #1F2933;
    transition: background 0.2s, border-color 0.2s;
  }
  .av-timer-urgent {
    background: #fff1f1;
    border-color: #fca5a5;
    color: #dc2626;
    animation: av-pulse 1s ease-in-out infinite;
  }
  @keyframes av-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.65; }
  }

  /* ── Meta bar ── */
  .av-meta-bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    background: #f8f9fb;
    border: 1px solid #e8ecf0;
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 20px;
    font-size: 14px;
    color: #4a5568;
    line-height: 1.5;
  }
  .av-meta-pills {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .av-pill {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    color: #fb8500;
    padding: 3px 10px;
    white-space: nowrap;
  }

  /* ── Progress bar ── */
  .av-progress-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }
  .av-progress-track {
    flex: 1;
    height: 6px;
    background: #e8ecf0;
    border-radius: 99px;
    overflow: hidden;
  }
  .av-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #fb8500, #e85d04);
    border-radius: 99px;
    transition: width 0.3s ease;
  }
  .av-progress-label {
    font-size: 12px;
    font-weight: 500;
    color: #718096;
    white-space: nowrap;
  }

  /* ── Questions ── */
  .av-questions {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .av-question {
    background: #fff;
    border: 1px solid #e8ecf0;
    border-radius: 14px;
    padding: 22px 24px;
    transition: box-shadow 0.15s;
  }
  .av-question:focus-within {
    box-shadow: 0 0 0 3px rgba(251, 133, 0, 0.12);
    border-color: #fb8500;
  }
  .av-question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .av-question-number {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a0aec0;
  }
  .av-question-points {
    font-size: 12px;
    font-weight: 600;
    color: #fb8500;
    background: #fff8f0;
    border: 1px solid #fde8c8;
    border-radius: 20px;
    padding: 2px 10px;
  }
  .av-question-text {
    font-size: 15px;
    font-weight: 500;
    color: #1F2933;
    line-height: 1.55;
    margin-bottom: 18px;
  }

  /* ── Options ── */
  .av-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .av-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1.5px solid #e8ecf0;
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    font-size: 14px;
    color: #2d3748;
    position: relative;
  }
  .av-option input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .av-option-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #cbd5e0;
    flex-shrink: 0;
    transition: border-color 0.15s, background 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .av-option:hover {
    background: #fafbfc;
    border-color: #b0bec5;
  }
  .av-option-selected {
    background: #fff8f0;
    border-color: #fb8500;
  }
  .av-option-selected .av-option-dot {
    border-color: #fb8500;
    background: #fb8500;
    box-shadow: inset 0 0 0 3px #fff;
  }

  /* ── Submit action ── */
  .av-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 32px;
  }
  .av-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fb8500;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    padding: 13px 28px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    box-shadow: 0 2px 8px rgba(251, 133, 0, 0.25);
  }
  .av-submit-btn:hover:not(:disabled) {
    background: #e07600;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(251, 133, 0, 0.3);
  }
  .av-submit-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  .av-submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .av-btn-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: av-spin 0.7s linear infinite;
  }
  @keyframes av-spin {
    to { transform: rotate(360deg); }
  }

  /* ── Result screen ── */
  .av-result {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .av-result-hero {
    border-radius: 16px;
    padding: 36px 28px;
    text-align: center;
  }
  .av-result-passed {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #065f46;
  }
  .av-result-failed {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }
  .av-result-icon {
    margin-bottom: 12px;
  }
  .av-result-hero h2 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
  }
  .av-result-hero p {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }

  /* ── Score card ── */
  .av-score-card {
    background: #fff;
    border: 1px solid #e8ecf0;
    border-radius: 16px;
    padding: 24px 28px;
  }
  .av-score-row {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 20px;
  }
  .av-score-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .av-score-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a0aec0;
  }
  .av-score-value {
    font-size: 32px;
    font-weight: 700;
    color: #1F2933;
  }
  .av-score-pct {
    font-size: 32px;
    font-weight: 700;
  }
  .av-pct-pass { color: #059669; }
  .av-pct-fail { color: #dc2626; }
  .av-score-divider {
    width: 1px;
    height: 48px;
    background: #e8ecf0;
  }
  .av-score-bar-track {
    height: 8px;
    background: #e8ecf0;
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 10px;
  }
  .av-score-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
  }
  .av-bar-pass { background: linear-gradient(90deg, #34d399, #059669); }
  .av-bar-fail { background: linear-gradient(90deg, #fb8500, #e85d04); }
  .av-score-hint {
    margin: 0;
    font-size: 12px;
    color: #a0aec0;
  }

  /* ── Full-screen states (loading / error) ── */
  .av-state-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 80px 24px;
    text-align: center;
    color: #4a5568;
  }
  .av-state-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .av-state-icon-error {
    background: #fff1f1;
    color: #dc2626;
  }
  .av-state-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1F2933;
  }
  .av-state-sub {
    margin: 0;
    font-size: 14px;
    color: #718096;
  }
  .av-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e8ecf0;
    border-top-color: #fb8500;
    border-radius: 50%;
    animation: av-spin 0.7s linear infinite;
  }
`;
