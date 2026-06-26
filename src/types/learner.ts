// Schedule Types
export interface ScheduleVenue {
    id: number;
    name: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}

export interface ScheduleFacilitator {
    id: number;
    name: string;
    avatar?: string;
    phone?: string;
    email?: string;
}

export interface ScheduleProgram {
    id: number;
    title: string;
    code?: string;
}

export interface AttendanceStats {
    total_days: number;
    present: number;
    absent: number;
    excused: number;
    late: number;
    attendance_rate: number;
}

export interface Schedule {
    id: number;
    participant_id: number;
    title: string;
    program: ScheduleProgram | null;
    start_date: string;
    end_date: string;
    daily_start_time?: string;
    daily_end_time?: string;
    days?: string[];
    training_dates?: string[];
    daily_rate: number;
    status: string;
    delivery_type?: string;
    platform?: string;
    description?: string;
    venue: ScheduleVenue | null;
    facilitator: ScheduleFacilitator | null;
    participant_status: string;
    attendance: AttendanceStats;
    recent_attendance?: AttendanceRecord[];
}

// Attendance Types
export interface AttendanceRecord {
    id?: number;
    date: string;
    status: 'pending' | 'present' | 'absent' | 'excused' | 'absent_authorized' | 'absent_unauthorized';
    arrival_status?: 'on_time' | 'late' | 'absent';
    checkin_time?: string;
    checkout_time?: string;
    checkin_method?: string;
    schedule?: {
        id: number;
        title: string;
        daily_rate: number;
    };
}

export interface TodayScheduleVenue {
    id: number;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    geofence_radius?: number;
}

export interface TodayScheduleAttendance {
    schedule_id: number;
    participant_id: number;
    schedule_title: string;
    start_time?: string;
    end_time?: string;
    venue?: TodayScheduleVenue;
    checked_in: boolean;
    attendance: {
        id: number;
        status: string;
        arrival_status?: string;
        checkin_time?: string;
        checkout_time?: string;
        checkin_method?: string;
    } | null;
    can_checkin: boolean;
    can_checkout: boolean;
}

export interface CheckinRequest {
    schedule_id: number;
    latitude?: number;
    longitude?: number;
    notes?: string;
}

export interface CheckinResponse {
    success: boolean;
    message: string;
    data?: {
        attendance_id: number;
        schedule_id: number;
        schedule_title: string;
        checkin_time: string;
        arrival_status: string;
        daily_rate: number;
    };
}

export interface CheckoutRequest {
    attendance_id: number;
    latitude?: number;
    longitude?: number;
    notes?: string;
}

export interface CheckoutResponse {
    success: boolean;
    message: string;
    data?: {
        attendance_id: number;
        checkout_time: string;
    };
}

// Absence Reason Types
export type AbsenceReasonCode =
    | 'running_late'
    | 'family_emergency'
    | 'not_feeling_well'
    | 'transport_issues'
    | 'other';

export interface AbsenceReason {
    code: AbsenceReasonCode;
    label: string;
    requiresDetails: boolean;
}

export const ABSENCE_REASONS: AbsenceReason[] = [
    { code: 'running_late', label: 'Running late', requiresDetails: false },
    { code: 'family_emergency', label: 'Family emergency', requiresDetails: true },
    { code: 'not_feeling_well', label: 'Not feeling well', requiresDetails: false },
    { code: 'transport_issues', label: 'Transport issues', requiresDetails: false },
    { code: 'other', label: 'Other reason', requiresDetails: true },
];

export interface SubmitAbsenceReasonRequest {
    schedule_id: number;
    reason_code: AbsenceReasonCode;
    details?: string;
    estimated_arrival_time?: string; // For "running_late"
    will_attend_today: boolean;
}

export interface SubmitAbsenceReasonResponse {
    success: boolean;
    message: string;
    data?: {
        attendance_id: number;
        status: string;
        reason_acknowledged: boolean;
    };
}

// Late check-in prompt (from push notification)
export interface LateCheckinPrompt {
    schedule_id: number;
    schedule_title: string;
    start_time: string;
    minutes_late: number;
    deadline_minutes: number; // Minutes until auto-marked absent
}

// Earnings Types
export interface EarningsBySchedule {
    schedule_id: number;
    schedule_title: string;
    days_attended: number;
    daily_rate: number;
    total_earned: number;
}

export interface BankAccountInfo {
    has_bank_account: boolean;
    bank_name?: string;
    account_type?: string;
    account_last_4?: string;
}

export interface EarningsSummary {
    total_earned: number;
    total_paid: number;
    total_pending: number;
    total_days_attended: number;
}

export interface EarningsResponse {
    success: boolean;
    data: {
        summary: EarningsSummary;
        by_schedule: EarningsBySchedule[];
        bank_account: BankAccountInfo;
    };
}

export interface Payment {
    id: number;
    amount: number;
    status: 'pending' | 'approved' | 'paid' | 'rejected' | 'verified';
    payment_date?: string;
    payment_type?: string;
    program?: {
        id: number;
        title: string;
    };
    reference_number?: string;
    paid_at?: string;
    created_at: string;
}

export interface Payslip {
    id: number;
    payslip_type: 'staff' | 'learner_stipend';
    title: string;
    period: string;
    file_name: string;
    file_type: string;
    file_size: number;
    download_url: string | null;
    stipend_amount: string | null;
    payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
    payment_date: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    created_at: string;
    program?: {
        id: number;
        name: string;
        display_name: string;
    };
}

// Profile Types
export interface ProfileCompletionSection {
    percentage: number;
    weight: number;
    weighted: number;
    completed?: number;
    total?: number;
    missing?: string[];
    required?: string[];
    is_complete?: boolean;
}

export interface ProfileCompletion {
    overall_percentage: number;
    is_complete: boolean;
    sections: {
        personal_info: ProfileCompletionSection;
        documents: ProfileCompletionSection;
        cv: ProfileCompletionSection;
        // psychometric: ProfileCompletionSection;
    };
    banking: {
        completed: number;
        total: number;
        percentage: number;
        missing: string[];
        is_complete: boolean;
    };
    can_receive_payments: boolean;
}

// Extended User (from /me endpoint)
export interface ExtendedUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: string;
    roles: string[];
    is_admin: boolean;
    firebase_uid?: string;
    student_number?: string;
    is_learner: boolean;
    is_employee: boolean;
    is_active: boolean;
    programs: ScheduleProgram[];
    has_active_schedule: boolean;
    active_schedule_count: number;
    checked_in_today: boolean;
    pending_payments: number;
    has_bank_account: boolean;
    profile_completion: number;
    personal_info: {
        gender?: string;
        birth_date?: string;
        nationality?: string;
        address?: string;
        city?: string;
        province?: string;
    };
}
