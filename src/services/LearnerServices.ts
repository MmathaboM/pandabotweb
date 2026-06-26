
import api from "./api";

import type {
  AttendanceRecord,
  CheckinRequest,
  CheckinResponse,
  CheckoutRequest,
  CheckoutResponse,
  EarningsResponse,
  Payment,
  Payslip,
  ProfileCompletion,
  Schedule,
  SubmitAbsenceReasonRequest,
  SubmitAbsenceReasonResponse,
  TodayScheduleAttendance,
} from "../types/learner";
export type {
  AttendanceRecord,
  CheckinRequest,
  CheckinResponse,
  CheckoutRequest,
  CheckoutResponse,
  EarningsResponse,
  Payment,
  Payslip,
  ProfileCompletion,
  Schedule,
  SubmitAbsenceReasonRequest,
  SubmitAbsenceReasonResponse,
  TodayScheduleAttendance,
};

// ─── Internal-only wrappers ───────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// HostLocation is not in types/learner.ts so it lives here.
export interface HostLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string;
  city?: string;
  schedule_id?: number;
  training_dates?: string[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const learnerService = {
  // ===========================================================================
  // SCHEDULES
  // ===========================================================================

  /**
   * Get user's assigned schedules across all enrolled programs.
   * @param status - 'active' | 'upcoming' | 'past' | 'all'
   */
  getSchedules: async (
    status: "active" | "upcoming" | "past" | "all" = "active",
  ): Promise<Schedule[]> => {
    const res = await api.get<{ success: boolean; schedules: Schedule[] }>(
      `/v1/my/schedules?status=${status}`,
    );
    return res.data.schedules;
  },

  /**
   * Get a single schedule by ID.
   */
  getSchedule: async (id: number): Promise<Schedule> => {
    const res = await api.get<{ success: boolean; schedules: Schedule[] }>(
      `/v1/my/schedules?status=all`,
    );
    const found = res.data.schedules.find((s) => s.id === id);
    if (!found) throw new Error(`Schedule ${id} not found`);
    return found;
  },

  // ===========================================================================
  // ATTENDANCE / CHECK-IN
  // ===========================================================================

  /**
   * Get today's attendance status for all active schedules.
   */
  getTodayAttendance: async (): Promise<{
    date: string;
    schedules: TodayScheduleAttendance[];
  }> => {
    const res = await api.get<{
      success: boolean;
      date: string;
      data: TodayScheduleAttendance[];
    }>("/v1/attendance/today");
    return {
      date: res.data.date,
      schedules: res.data.data,
    };
  },

  /**
   * Check in to a schedule.
   * latitude/longitude are optional — omit if not using geofencing on web.
   */
  checkin: async (data: CheckinRequest): Promise<CheckinResponse> => {
    const res = await api.post<CheckinResponse>("/v1/attendance/checkin", data);
    return res.data;
  },

  /**
   * Check out from a schedule.
   */
  checkout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    const res = await api.post<CheckoutResponse>(
      "/v1/attendance/checkout",
      data,
    );
    return res.data;
  },

  /**
   * Submit absence / late-arrival reason.
   */
  submitAbsenceReason: async (
    data: SubmitAbsenceReasonRequest,
  ): Promise<SubmitAbsenceReasonResponse> => {
    const res = await api.post<SubmitAbsenceReasonResponse>(
      "/v1/attendance/absence-reason",
      data,
    );
    return res.data;
  },

  /**
   * Register device token for schedule push notifications.
   */
  registerForScheduleNotifications: async (data: {
    push_token: string;
    timezone: string;
  }): Promise<{ success: boolean }> => {
    const res = await api.post<{ success: boolean }>(
      "/v1/notifications/schedule-reminders",
      data,
    );
    return res.data;
  },

  /**
   * Get paginated attendance history.
   * @param scheduleId - Optional: filter by schedule
   * @param month      - Optional: format YYYY-MM
   */
  getAttendanceHistory: async (
    scheduleId?: number,
    month?: string,
    page = 1,
    perPage = 30,
  ): Promise<PaginatedResponse<AttendanceRecord>> => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (scheduleId) params.append("schedule_id", String(scheduleId));
    if (month) params.append("month", month);

    const res = await api.get<PaginatedResponse<AttendanceRecord>>(
      `/v1/attendance/history?${params}`,
    );
    return res.data;
  },

  // ===========================================================================
  // EARNINGS
  // ===========================================================================

  /**
   * Get earnings summary, by-schedule breakdown, and bank account details.
   * Returns EarningsResponse["data"] which contains:
   *   summary: { total_earned, total_paid, total_pending, total_days_attended }
   *   by_schedule: EarningsBySchedule[]
   *   bank_account: BankAccountInfo
   */
  getEarnings: async (): Promise<EarningsResponse["data"]> => {
    const res = await api.get<EarningsResponse>("/v1/earnings");
    return res.data.data;
  },

  /**
   * Get paginated payment history.
   * @param status - Optional: filter by payment status
   */
  getPaymentHistory: async (
    status?: "pending" | "approved" | "paid" | "rejected",
    page = 1,
    perPage = 20,
  ): Promise<PaginatedResponse<Payment>> => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (status) params.append("status", status);

    const res = await api.get<PaginatedResponse<Payment>>(
      `/v1/earnings/payments?${params}`,
    );
    return res.data;
  },

  // ===========================================================================
  // PROFILE
  // ===========================================================================

  /**
   * Get profile completion status.
   * Returns: overall_percentage, is_complete, sections, banking, can_receive_payments
   */
  getProfileCompletion: async (): Promise<ProfileCompletion> => {
    const res = await api.get<ApiResponse<ProfileCompletion>>(
      "/v1/profile/completion",
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message ?? "Failed to fetch profile completion");
    }
    return res.data.data;
  },

  // ===========================================================================
  // PAYSLIPS
  // ===========================================================================

  /**
   * Get paginated list of payslip documents.
   */
  getPayslips: async (
    page = 1,
    perPage = 10,
  ): Promise<PaginatedResponse<Payslip>> => {
    const res = await api.get<PaginatedResponse<Payslip>>(
      `/v1/payslips?page=${page}&per_page=${perPage}`,
    );
    return res.data;
  },

  /**
   * Get a single payslip by ID.
   */
  getPayslip: async (id: number): Promise<Payslip> => {
    const res = await api.get<ApiResponse<Payslip>>(`/v1/payslips/${id}`);
    return res.data.data;
  },

  /**
   * Get a signed download URL for a payslip PDF.
   */
  getPayslipDownloadUrl: async (
    id: number,
  ): Promise<{
    download_url: string;
    type: "external" | "local";
    expires_at?: string;
  }> => {
    const res = await api.get<{
      success: boolean;
      download_url: string;
      type: "external" | "local";
      expires_at?: string;
    }>(`/v1/payslips/${id}/download`);
    return res.data;
  },

  // ===========================================================================
  // HOST LOCATIONS
  // ===========================================================================

  /**
   * Get host locations for proximity / geofence tracking.
   * @param todayOnly - If true, only returns hosts with sessions today
   */
  getHostLocations: async (todayOnly = true): Promise<HostLocation[]> => {
    const params = todayOnly ? "?today=true" : "";
    const res = await api.get<ApiResponse<HostLocation[]>>(
      `/v1/host-locations${params}`,
    );
    return res.data.data;
  },
};

export default learnerService;
