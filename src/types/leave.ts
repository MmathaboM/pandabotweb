// types/leave.ts

export interface LeaveType {
  id: string; // now a string (enum value like 'learner_annual')
  name: string;
  description?: string;
  color: string;
  requires_documentation: boolean;
  is_paid: boolean;
  max_days_per_year?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveApplication {
  id: number;
  user_id: number;
  leave_type: string; // enum value (e.g. 'learner_annual')
  leave_type_label: string; // human-readable label
  start_date: string;
  end_date: string;
  days_requested: number;
  is_half_day: boolean;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  rejection_reason?: string;
  manager_comments?: string;
  documents?: LeaveDocument[];
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  approved_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface LeaveDocument {
  id: number;
  leave_application_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface LeaveBalance {
  id: number;
  leave_type: string; // enum value (e.g. 'learner_annual')
  user_id: number;
  year: number;
  entitlement: number;
  used: number;
  pending: number;
  available: number;
  carried_over?: number;
}

export interface LeaveApplicationsResponse {
  success: boolean;
  leave_applications: LeaveApplication[];
  total?: number;
}

export interface LeaveBalancesResponse {
  success: boolean;
  leave_balances: LeaveBalance[];
}

export interface LeaveTypesResponse {
  success: boolean;
  leave_types: LeaveType[];
}

export interface SubmitLeaveApplicationRequest {
  leave_type: string; // enum value
  start_date: string;
  end_date: string;
  reason: string;
  is_half_day: boolean;
  documents?: File[];
}

export interface SubmitLeaveResponse {
  success: boolean;
  message: string;
  leave_application?: LeaveApplication;
}

export interface UpdateLeaveApplicationRequest {
  id: number;
  start_date?: string;
  end_date?: string;
  reason?: string;
  is_half_day?: boolean;
  documents?: File[];
}

export interface UpdateLeaveResponse {
  success: boolean;
  message: string;
  leave_application?: LeaveApplication;
}

export interface CancelLeaveResponse {
  success: boolean;
  message: string;
}
