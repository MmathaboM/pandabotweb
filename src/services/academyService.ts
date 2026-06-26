import api from './api';
import type { Schedule, Payslip, LeaveRequest } from '../types';

const unwrap = <T>(raw: any): T =>
  raw?.data !== undefined ? raw.data : raw;

export interface SubmitLeavePayload {
  type: string;
  from_date: string;  // ISO "YYYY-MM-DD"
  to_date: string;
  reason: string;
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  personal: number;
}

export interface LearningModule {
  id: string;
  emoji: string;
  title: string;
  sub: string;
  progress: number; // 0–100
  bg?: string;
}

export const academyService = {
  // ── Schedules ──────────────────────────────────────────────────────────────

  /** GET /academy/schedules */
  async getSchedules(): Promise<Schedule[]> {
    const { data } = await api.get('/academy/schedules');
    return Array.isArray(data) ? data : unwrap<Schedule[]>(data);
  },

  // ── Payslips ───────────────────────────────────────────────────────────────

  /** GET /academy/payslips */
  async getPayslips(): Promise<Payslip[]> {
    const { data } = await api.get('/academy/payslips');
    return Array.isArray(data) ? data : unwrap<Payslip[]>(data);
  },

  /** GET /academy/payslips/:id/download  → PDF blob */
  async downloadPayslip(id: string): Promise<Blob> {
    const { data } = await api.get(`/academy/payslips/${id}/download`, {
      responseType: 'blob',
    });
    return data as Blob;
  },

  // ── Leave ──────────────────────────────────────────────────────────────────

  /** GET /academy/leaves */
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    const { data } = await api.get('/academy/leaves');
    return Array.isArray(data) ? data : unwrap<LeaveRequest[]>(data);
  },

  /** GET /academy/leaves/balance */
  async getLeaveBalance(): Promise<LeaveBalance> {
    const { data } = await api.get('/academy/leaves/balance');
    return unwrap<LeaveBalance>(data);
  },

  /** POST /academy/leaves */
  async submitLeaveRequest(payload: SubmitLeavePayload): Promise<LeaveRequest> {
    const { data } = await api.post('/academy/leaves', payload);
    return unwrap<LeaveRequest>(data);
  },

  // ── Learning modules ───────────────────────────────────────────────────────

  /** GET /academy/modules */
  async getLearningModules(): Promise<LearningModule[]> {
    const { data } = await api.get('/academy/modules');
    return Array.isArray(data) ? data : unwrap<LearningModule[]>(data);
  },

  // ── Student card ───────────────────────────────────────────────────────────

  /** GET /academy/student-card/download → PDF blob */
  async downloadStudentCard(): Promise<Blob> {
    const { data } = await api.get('/academy/student-card/download', {
      responseType: 'blob',
    });
    return data as Blob;
  },
};

// ── Blob download helper (use in components) ──────────────────────────────────
export const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
