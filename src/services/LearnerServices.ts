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
  PayslipDownloadResponse,
  ProfileCompletion,
  Schedule,
  SubmitAbsenceReasonRequest,
  SubmitAbsenceReasonResponse,
  TodayScheduleAttendance,
  ApiResponse,
  PaginatedResponse,
  HostLocation,
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
  PayslipDownloadResponse,
  ProfileCompletion,
  Schedule,
  SubmitAbsenceReasonRequest,
  SubmitAbsenceReasonResponse,
  TodayScheduleAttendance,
  ApiResponse,
  PaginatedResponse,
  HostLocation,
};

// Hardcoded payroll API token
const PAYROLL_API_TOKEN =
  "a84b61b50783e1228c40824558b256b4e4c06e42913d07b281d064e93fa33e7b";

// ConnectHR API Base URL
const CONNECTHR_API_BASE = "https://academy.connecthr.co.za/api/v1";


export const learnerService = {

  getSchedules: async (
    status: "active" | "upcoming" | "past" | "all" = "active",
  ): Promise<Schedule[]> => {
    const res = await api.get<{ success: boolean; schedules: Schedule[] }>(
      `/v1/my/schedules?status=${status}`,
    );
    return res.data.schedules;
  },

  getSchedule: async (id: number): Promise<Schedule> => {
    const res = await api.get<{ success: boolean; schedules: Schedule[] }>(
      `/v1/my/schedules?status=all`,
    );
    const found = res.data.schedules.find((s) => s.id === id);
    if (!found) throw new Error(`Schedule ${id} not found`);
    return found;
  },

  
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

  checkin: async (data: CheckinRequest): Promise<CheckinResponse> => {
    const res = await api.post<CheckinResponse>("/v1/attendance/checkin", data);
    return res.data;
  },

  checkout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    const res = await api.post<CheckoutResponse>(
      "/v1/attendance/checkout",
      data,
    );
    return res.data;
  },

  submitAbsenceReason: async (
    data: SubmitAbsenceReasonRequest,
  ): Promise<SubmitAbsenceReasonResponse> => {
    const res = await api.post<SubmitAbsenceReasonResponse>(
      "/v1/attendance/absence-reason",
      data,
    );
    return res.data;
  },

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

  // EARNINGS
 
  getEarnings: async (): Promise<EarningsResponse["data"]> => {
    const res = await api.get<EarningsResponse>("/v1/earnings");
    return res.data.data;
  },

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

  // PROFILE

  getProfileCompletion: async (): Promise<ProfileCompletion> => {
    const res = await api.get<ApiResponse<ProfileCompletion>>(
      "/v1/profile/completion",
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message ?? "Failed to fetch profile completion");
    }
    return res.data.data;
  },

  /**
   * Get payslips for a learner directly from ConnectHR Academy API
   * @param saIdNumber -
   */
  getLearnerPayslips: async (saIdNumber: string): Promise<Payslip[]> => {
    try {
      const cleanIdNumber = saIdNumber.replace(/\s/g, "");

      console.log("📄 [ConnectHR] Fetching payslips for SA ID:", cleanIdNumber);

      const url = `${CONNECTHR_API_BASE}/learners/${cleanIdNumber}/payslips`;
      console.log("[ConnectHR] URL:///////////", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYROLL_API_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log("[ConnectHR] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ConnectHR] Error response:////////////", errorText);

        if (response.status === 401) {
          throw new Error(
            "Authentication failed. The payroll API token is invalid or expired.",
          );
        } else if (response.status === 404) {
          throw new Error("📭 No payslips found for this SA ID number.");
        } else {
          throw new Error(
            `Failed to fetch payslips: ${response.status} - ${errorText}`,
          );
        }
      }

      const data = await response.json();
      console.log("[ConnectHR] Response data:", data);

      const payslips = data.data || data || [];
      return Array.isArray(payslips) ? payslips : [];
    } catch (error) {
      console.error("[ConnectHR] Failed to fetch payslips://///////", error);
      throw error;
    }
  },

  downloadLearnerPayslip: async (
    saIdNumber: string,
    payslipId: number,
  ): Promise<Blob> => {
    try {
      const cleanIdNumber = saIdNumber.replace(/\s/g, "");

      const url = `${CONNECTHR_API_BASE}/learners/${cleanIdNumber}/payslips/${payslipId}/download`;
      console.log("[ConnectHR] Downloading from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYROLL_API_TOKEN}`,
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [ConnectHR] Download error:", errorText);

        if (response.status === 401) {
          throw new Error(
            "Authentication failed. The payroll API token is invalid or expired.",
          );
        } else if (response.status === 404) {
          throw new Error("Payslip PDF not found.");
        } else {
          throw new Error(`Failed to download payslip: ${response.status}`);
        }
      }

      return await response.blob();
    } catch (error) {
      console.error("[ConnectHR] Failed to download payslip:", error);
      throw error;
    }
  },

  
  // HOST LOCATIONS

  getHostLocations: async (todayOnly = true): Promise<HostLocation[]> => {
    const params = todayOnly ? "?today=true" : "";
    const res = await api.get<ApiResponse<HostLocation[]>>(
      `/v1/host-locations${params}`,
    );
    return res.data.data;
  },
};

export default learnerService;
