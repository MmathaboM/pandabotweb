import api from "./api";
import {
  LeaveType,
  LeaveBalance,
  LeaveApplication,
  LeaveApplicationsResponse,
  LeaveBalancesResponse,
  LeaveTypesResponse,
  SubmitLeaveApplicationRequest,
  SubmitLeaveResponse,
  UpdateLeaveApplicationRequest,
  UpdateLeaveResponse,
  CancelLeaveResponse,
} from "../types/leave";

class LeaveService {
  /**
   * GET /v1/leave/types
   * Returns all available leave types.
   */
  async getLeaveTypes(): Promise<LeaveType[]> {
    const response = await api.get<LeaveTypesResponse>("/v1/leave/types");
    return response.data.leave_types;
  }

  /**
   * GET /v1/leave/balances
   * Returns the authenticated user's leave balances for the current cycle year.
   */
  async getLeaveBalances(): Promise<LeaveBalance[]> {
    const response = await api.get<LeaveBalancesResponse>("/v1/leave/balances");
    return response.data.leave_balances;
  }

  /**
   * GET /v1/leave/applications
   * Returns the authenticated user's leave applications (most recent first).
   * @param status Optional filter: pending, approved, rejected, cancelled
   */
  async getLeaveApplications(status?: string): Promise<LeaveApplication[]> {
    const params = status ? { status } : {};
    const response = await api.get<LeaveApplicationsResponse>(
      "/v1/leave/applications",
      { params },
    );
    return response.data.leave_applications;
  }

  /**
   * GET /v1/leave/applications/{id}
   * Returns a single leave application.
   */
  async getLeaveApplication(id: number): Promise<LeaveApplication> {
    const response = await api.get<{
      success: boolean;
      leave_application: LeaveApplication;
    }>(`/v1/leave/applications/${id}`);
    return response.data.leave_application;
  }

  /**
   * POST /v1/leave/applications
   * Submit a new leave application with optional documents.
   */
  async submitLeaveApplication(
    data: SubmitLeaveApplicationRequest,
  ): Promise<SubmitLeaveResponse> {
    const formData = new FormData();
    formData.append("leave_type", data.leave_type); // ✅ string, not ID
    formData.append("start_date", data.start_date);
    formData.append("end_date", data.end_date);
    formData.append("reason", data.reason);
    formData.append("is_half_day", String(data.is_half_day));

    if (data.documents && data.documents.length > 0) {
      data.documents.forEach((file) => {
        formData.append("documents[]", file);
      });
    }

    const response = await api.post<SubmitLeaveResponse>(
      "/v1/leave/applications", // ✅ consistent path
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  }

  /**
   * PUT /v1/leave/applications/{id}
   * Update a pending leave application (only while status is pending).
   */
  async updateLeaveApplication(
    id: number,
    data: UpdateLeaveApplicationRequest,
  ): Promise<UpdateLeaveResponse> {
    const formData = new FormData();
    if (data.start_date) formData.append("start_date", data.start_date);
    if (data.end_date) formData.append("end_date", data.end_date);
    if (data.reason) formData.append("reason", data.reason);
    if (data.is_half_day !== undefined) {
      formData.append("is_half_day", String(data.is_half_day));
    }
    if (data.documents && data.documents.length > 0) {
      data.documents.forEach((file) => {
        formData.append("documents[]", file);
      });
    }

    // Laravel requires _method=PUT for file uploads over POST
    formData.append("_method", "PUT");

    const response = await api.post<UpdateLeaveResponse>(
      `/v1/leave/applications/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  }

  /**
   * DELETE /v1/leave/applications/{id}
   * Cancel / withdraw a pending leave application.
   */
  async cancelLeaveApplication(id: number): Promise<CancelLeaveResponse> {
    const response = await api.delete<CancelLeaveResponse>(
      `/v1/leave/applications/${id}`,
    );
    return response.data;
  }
}

export default new LeaveService();
