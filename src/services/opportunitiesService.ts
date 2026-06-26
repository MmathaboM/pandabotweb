// services/opportunitiesService.ts
import api from "./api";
import type { Opportunity } from "../types";
import type {
  Assessment,
  AssessmentResult,
} from "../types/assessment";

export interface OpportunityFilters {
  q?: string;
  province_id?: number;
  salary?: string;
  closing_date_from?: string;
  closing_date_to?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedOpportunities {
  data: Opportunity[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}

export interface OpportunitySubscription {
  id: number;
  opportunity_type_id: number;
  opportunity_type_name: string;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
}

export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "shortlisted"
  | "interviewed"
  | "accepted"
  | "rejected"
  | "onboarding"
  | "completed";

export interface OpportunityApplication {
  id: number;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  opportunity: Opportunity | null;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  reviewing: number;
  shortlisted: number;
  interviewed: number;
  accepted: number;
  rejected: number;
  onboarding: number;
  completed: number;
  active_pending?: number;
  unsuccessful?: number;
  upcoming_interviews_count?: number;
  upcoming_interviews?: Array<{
    application_id: number;
    opportunity_title: string;
    interview_date: string;
    interview_date_formatted: string;
    interview_location: string;
  }>;
}

export interface ApplicationNote {
  id: number;
  note: string;
  created_at: string;
  created_at_formatted: string;
  created_by: string;
}

export interface ApplicationDetail {
  id: number;
  status: string;
  status_label: string;
  applied_at: string;
  invited_to_interview_at: string | null;
  interview_scheduled_at: string | null;
  interview_location: string | null;
  has_upcoming_interview: boolean;
  opportunity: {
    id: number;
    title: string;
    description: string | null;
    closing_date: string | null;
  };
  latest_notes: ApplicationNote[];
}

export interface InterviewDetails {
  application_id: number;
  opportunity_title: string;
  interview_date: string;
  interview_date_formatted: string;
  interview_time_formatted: string;
  interview_location: string;
  status: string;
  status_label: string;
  is_upcoming: boolean;
  has_passed: boolean;
  invited_at: string | null;
  message: string;
}

export const opportunitiesService = {
  // ----- Opportunities -----
  async getOpportunities(filters?: OpportunityFilters): Promise<Opportunity[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.append("q", filters.q);
    if (filters?.province_id)
      params.append("province_id", String(filters.province_id));
    if (filters?.salary) params.append("salary", filters.salary);
    if (filters?.closing_date_from)
      params.append("closing_date_from", filters.closing_date_from);
    if (filters?.closing_date_to)
      params.append("closing_date_to", filters.closing_date_to);
    const query = params.toString();
    const { data } = await api.get(
      `/v1/opportunities${query ? `?${query}` : ""}`,
    );
    return Array.isArray(data) ? data : data.data || [];
  },

  async getOpportunitiesPaginated(
    filters?: OpportunityFilters,
  ): Promise<PaginatedOpportunities> {
    const params: Record<string, any> = {
      page: filters?.page || 1,
      per_page: filters?.per_page || 10,
    };
    if (filters?.q) params.q = filters.q;
    if (filters?.province_id) params.province_id = filters.province_id;
    if (filters?.salary) params.salary = filters.salary;
    if (filters?.closing_date_from)
      params.closing_date_from = filters.closing_date_from;
    if (filters?.closing_date_to)
      params.closing_date_to = filters.closing_date_to;

    const { data } = await api.get<PaginatedOpportunities>(
      "/v1/opportunities",
      { params },
    );
    return data;
  },

  async getOpportunityDetails(
    id: number,
  ): Promise<{ success: boolean; data: Opportunity }> {
    const { data } = await api.post(`/v1/opportunities/${id}`);
    return data;
  },

  async getProvinces(): Promise<{ id: number; name: string; code?: string }[]> {
    const { data } = await api.get("/v1/opportunities/provinces");
    return data.data || data;
  },

  async apply(opportunityId: number, documentIds?: number[]): Promise<any> {
    const { data } = await api.post(
      `/v1/opportunities/${opportunityId}/apply`,
      {
        document_ids: documentIds ?? [],
      },
    );
    return data;
  },

  applyForOpportunity: async (id: string, documentIds?: number[]) => {
    return opportunitiesService.apply(parseInt(id, 10), documentIds);
  },

  async bookmarkOpportunity(
    id: string,
  ): Promise<{ message: string; bookmarked: boolean }> {
    const { data } = await api.post(`/v1/opportunities/${id}/bookmark`);
    return data;
  },

  async getBookmarked(): Promise<Opportunity[]> {
    const { data } = await api.get("/v1/opportunities/bookmarked");
    return Array.isArray(data) ? data : data.data || [];
  },

  // ----- Subscriptions -----
  async getSubscriptions(): Promise<OpportunitySubscription[]> {
    const { data } = await api.get("/v1/opportunities/subscriptions");
    return data.data || [];
  },

  async subscribeToType(
    opportunityTypeId: number,
    options?: { email?: boolean; push?: boolean },
  ): Promise<OpportunitySubscription> {
    const { data } = await api.post("/v1/opportunities/subscriptions", {
      opportunity_type_id: opportunityTypeId,
      email_notifications: options?.email ?? true,
      push_notifications: options?.push ?? true,
    });
    return data.data;
  },

  async unsubscribeFromType(subscriptionId: number): Promise<void> {
    await api.delete(`/v1/opportunities/subscriptions/${subscriptionId}`);
  },

  async checkSubscription(
    opportunityTypeId: number,
  ): Promise<OpportunitySubscription | null> {
    try {
      const { data } = await api.get(
        `/v1/opportunities/subscriptions/check/${opportunityTypeId}`,
      );
      return data.data || null;
    } catch {
      return null;
    }
  },

  // ----- My Applications -----
  async getMyApplications(
    status?: ApplicationStatus,
  ): Promise<OpportunityApplication[]> {
    const params = status ? `?status=${status}` : "";
    const { data } = await api.get(
      `/v1/opportunities/my-applications${params}`,
    );
    return data.data || [];
  },

  async getMyApplicationStats(): Promise<ApplicationStats> {
    const { data } = await api.get("/v1/opportunities/my-applications/stats");
    return data;
  },

  async getApplicationDetails(
    applicationId: number,
  ): Promise<ApplicationDetail> {
    const { data } = await api.get(
      `/v1/opportunities/my-applications/${applicationId}`,
    );
    return data.data;
  },

  async getInterviewDetails(applicationId: number): Promise<InterviewDetails> {
    const { data } = await api.get(
      `/v1/opportunities/my-applications/${applicationId}/interview`,
    );
    return data.data;
  },

  async confirmInterview(
    applicationId: number,
    willAttend: boolean,
  ): Promise<void> {
    const { data } = await api.post(
      `/v1/opportunities/my-applications/${applicationId}/confirm-interview`,
      { will_attend: willAttend },
    );
    return data;
  },
  async getMyAssessments(): Promise<Assessment[]> {
    const { data } = await api.get("/v1/assessments/my");
    return data.data || [];
  },

 async getAssessmentDetails(assessmentId: number, opportunityId: number): Promise<Assessment> {
  const { data } = await api.get(`/v1/assessments/${assessmentId}`, {
    params: { opportunity_id: opportunityId },
  });
  return data.data;
},

  async submitAssessment(
    assessmentId: number,
    opportunityId: number,
    answers: Record<number, number>, 
  ): Promise<{ message: string; result: AssessmentResult }> {
    const { data } = await api.post(`/v1/assessments/${assessmentId}/submit`, {
      opportunity_id: opportunityId,
      answers,
    });
    return data;
  },

  async getAssessmentResult(
    assessmentId: number,
    opportunityId: number,
  ): Promise<AssessmentResult> {
    const { data } = await api.get(`/v1/assessments/${assessmentId}/result`, {
      params: { opportunity_id: opportunityId },
    });
    return data.data;
  },
};
