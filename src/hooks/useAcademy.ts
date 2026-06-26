import { useState, useEffect, useCallback } from 'react';
import {
  academyService,
  LeaveBalance,
  LearningModule,
  SubmitLeavePayload,
  triggerBlobDownload,
} from '../services/academyService';
import {
  mockSchedules,
  mockPayslips,
  mockLeaves,
} from '../data/mock';
import type { Schedule, Payslip, LeaveRequest } from '../types';

// ── Schedules ─────────────────────────────────────────────────────────────────

export const useSchedules = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setSchedules(await academyService.getSchedules());
      } catch {
        setSchedules(mockSchedules);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { schedules, loading };
};

// ── Payslips ──────────────────────────────────────────────────────────────────

export const usePayslips = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setPayslips(await academyService.getPayslips());
      } catch {
        setPayslips(mockPayslips);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const download = useCallback(async (id: string, month: string) => {
    const blob = await academyService.downloadPayslip(id);
    triggerBlobDownload(blob, `Payslip-${month}.pdf`);
  }, []);

  return { payslips, loading, download };
};

// ── Leave ─────────────────────────────────────────────────────────────────────

export const useLeave = () => {
  const [leaves, setLeaves]           = useState<LeaveRequest[]>([]);
  const [balance, setBalance]         = useState<LeaveBalance>({ annual: 15, sick: 8, personal: 3 });
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [leaveData, balData] = await Promise.allSettled([
          academyService.getLeaveRequests(),
          academyService.getLeaveBalance(),
        ]);
        if (leaveData.status === 'fulfilled') setLeaves(leaveData.value);
        else setLeaves(mockLeaves);
        if (balData.status === 'fulfilled') setBalance(balData.value);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submit = async (payload: SubmitLeavePayload) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const newLeave = await academyService.submitLeaveRequest(payload);
      setLeaves((prev) => [newLeave, ...prev]);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Failed to submit leave request.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { leaves, balance, loading, submit, submitting, submitError };
};

// ── Learning modules ──────────────────────────────────────────────────────────

const MOCK_MODULES: LearningModule[] = [
  { id: '1', emoji: '⚛️', bg: '#EFF6FF', title: 'React & TypeScript', sub: '8 modules · 24 hours', progress: 65 },
  { id: '2', emoji: '🗄️', bg: '#F0FDF4', title: 'Databases & SQL',    sub: '6 modules · 18 hours', progress: 100 },
  { id: '3', emoji: '🌐', bg: '#FFF7ED', title: 'HTML, CSS & Web',     sub: '5 modules · 12 hours', progress: 100 },
  { id: '4', emoji: '🤝', bg: '#F5F3FF', title: 'Professional Skills', sub: '4 modules · 8 hours',  progress: 40 },
  { id: '5', emoji: '⚙️', bg: '#ECFDF5', title: 'Agile & Scrum',       sub: '3 modules · 6 hours',  progress: 20 },
];

export const useLearningModules = () => {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setModules(await academyService.getLearningModules());
      } catch {
        setModules(MOCK_MODULES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { modules, loading };
};
