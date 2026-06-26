// types/assessment.ts
export interface AssessmentQuestion {
  id: number;
  question_text: string;
  type: "multiple_choice" | "text" | "single_choice";
  options?: string[];
  points: number;
}

// types/assessment.ts
export interface Assessment {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    status: "not_started" | "in_progress" | "completed";
    score?: number;
    max_score?: number;
    passed?: boolean;
    completed_at?: string;
    due_date?: string;
    opportunity_id?: number;
    questions?: AssessmentQuestion[];
  }
export interface AssessmentSubmission {
  assessment_id: number;
  answers: Array<{
    question_id: number;
    answer: string | string[];
  }>;
}

export interface AssessmentResult {
  assessment_id: number;
  title: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  feedback?: string;
  completed_at: string;
  answers_review?: Array<{
    question_text: string;
    user_answer: string;
    correct_answer?: string;
    is_correct?: boolean;
    points_earned: number;
    max_points: number;
  }>;
}
