import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { startOfWeek } from "date-fns/startOfWeek";
import { isSameWeek } from "date-fns/isSameWeek";
import { startOfDay } from "date-fns/startOfDay";
import type {
  Schedule,
  TodayScheduleAttendance,
  EarningsSummary,
  EarningsBySchedule,
  BankAccountInfo,
  Payment,
} from "../types/learner";

export type ScheduleFilter = "active" | "upcoming" | "past" | "all";
export type PaymentFilter =
  | "pending"
  | "approved"
  | "paid"
  | "rejected"
  | undefined;

export interface PendingCheckin {
  id: string;
  type: "checkin" | "checkout";
  scheduleId: number;
  attendanceId?: number;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  synced: boolean;
}

interface AcademyState {
  // Cached data
  schedules: Schedule[];
  todayAttendance: TodayScheduleAttendance[];
  earnings: {
    summary: EarningsSummary;
    bySchedule: EarningsBySchedule[];
    bankAccount: BankAccountInfo;
  } | null;
  payments: Payment[];

  // Offline check-ins pending sync
  pendingCheckins: PendingCheckin[];

  // Absence sheet trigger (from push notification)
  absenceSheetScheduleId: number | null;

  // Loading states
  isLoadingSchedules: boolean;
  isLoadingAttendance: boolean;
  isLoadingEarnings: boolean;
  isLoadingPayments: boolean;

  // Filters
  scheduleFilter: ScheduleFilter;
  paymentFilter: PaymentFilter;

  // Weekly cache tracking
  weekStartDate: string | null; // ISO string of the week start
  lastSyncTimestamp: number | null;

  // Last fetch timestamps (for individual data)
  schedulesLastFetch: number | null;
  attendanceLastFetch: number | null;
  earningsLastFetch: number | null;
  paymentsLastFetch: number | null;

  // Date tracking for daily data
  attendanceDateStr: string | null; // ISO date string for todayAttendance

  // Actions
  setSchedules: (schedules: Schedule[]) => void;
  setTodayAttendance: (attendance: TodayScheduleAttendance[]) => void;
  setEarnings: (earnings: AcademyState["earnings"]) => void;
  setPayments: (payments: Payment[]) => void;

  setScheduleFilter: (filter: ScheduleFilter) => void;
  setPaymentFilter: (filter: PaymentFilter) => void;

  setLoadingSchedules: (loading: boolean) => void;
  setLoadingAttendance: (loading: boolean) => void;
  setLoadingEarnings: (loading: boolean) => void;
  setLoadingPayments: (loading: boolean) => void;

  // Update a single attendance record after check-in/out
  updateAttendance: (
    scheduleId: number,
    updates: Partial<TodayScheduleAttendance>,
  ) => void;

  // Offline check-in management
  addPendingCheckin: (checkin: Omit<PendingCheckin, "id" | "synced">) => string;
  markCheckinSynced: (id: string) => void;
  removePendingCheckin: (id: string) => void;
  getUnsyncedCheckins: () => PendingCheckin[];

  // Weekly cache management
  shouldRefreshCache: () => boolean;
  updateLastSync: () => void;
  isDataStale: (lastFetch: number | null, maxAgeMs?: number) => boolean;

  // Schedule cache validation (7-day window for offline check-in)
  hasValidScheduleCache: () => boolean;

  // Daily attendance validation
  isTodayAttendanceStale: () => boolean;
  clearStaleAttendance: () => void;

  // Absence sheet trigger (from push notification)
  setAbsenceSheetScheduleId: (scheduleId: number | null) => void;
  clearAbsenceSheet: () => void;

  // Clear all data (on logout)
  reset: () => void;
}

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const initialState = {
  schedules: [],
  todayAttendance: [],
  earnings: null,
  payments: [],
  pendingCheckins: [],
  absenceSheetScheduleId: null as number | null,
  isLoadingSchedules: false,
  isLoadingAttendance: false,
  isLoadingEarnings: false,
  isLoadingPayments: false,
  scheduleFilter: "active" as ScheduleFilter,
  paymentFilter: undefined as PaymentFilter,
  weekStartDate: null,
  lastSyncTimestamp: null,
  schedulesLastFetch: null,
  attendanceLastFetch: null,
  earningsLastFetch: null,
  paymentsLastFetch: null,
  attendanceDateStr: null,
};

// Cache duration: 1 hour for most data, but week-based for schedules
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
// Schedule cache kept for at least 7 days so offline check-in always works
const SCHEDULE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSchedules: (schedules) => {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        set({
          schedules,
          schedulesLastFetch: Date.now(),
          weekStartDate: weekStart.toISOString(),
        });
      },

      setTodayAttendance: (todayAttendance) =>
        set({
          todayAttendance,
          attendanceLastFetch: Date.now(),
          attendanceDateStr: startOfDay(new Date()).toISOString(),
        }),

      setEarnings: (earnings) =>
        set({ earnings, earningsLastFetch: Date.now() }),

      setPayments: (payments) =>
        set({ payments, paymentsLastFetch: Date.now() }),

      setScheduleFilter: (scheduleFilter) => set({ scheduleFilter }),
      setPaymentFilter: (paymentFilter) => set({ paymentFilter }),

      setLoadingSchedules: (isLoadingSchedules) => set({ isLoadingSchedules }),
      setLoadingAttendance: (isLoadingAttendance) =>
        set({ isLoadingAttendance }),
      setLoadingEarnings: (isLoadingEarnings) => set({ isLoadingEarnings }),
      setLoadingPayments: (isLoadingPayments) => set({ isLoadingPayments }),

      updateAttendance: (scheduleId, updates) =>
        set((state) => ({
          todayAttendance: state.todayAttendance.map((item) =>
            item.schedule_id === scheduleId ? { ...item, ...updates } : item,
          ),
        })),

      // Offline check-in management
      addPendingCheckin: (checkin) => {
        const id = generateId();
        set((state) => ({
          pendingCheckins: [
            ...state.pendingCheckins,
            { ...checkin, id, synced: false },
          ],
        }));
        return id;
      },

      markCheckinSynced: (id) =>
        set((state) => ({
          pendingCheckins: state.pendingCheckins.map((c) =>
            c.id === id ? { ...c, synced: true } : c,
          ),
        })),

      removePendingCheckin: (id) =>
        set((state) => ({
          pendingCheckins: state.pendingCheckins.filter((c) => c.id !== id),
        })),

      getUnsyncedCheckins: () => {
        return get().pendingCheckins.filter((c) => !c.synced);
      },

      // Weekly cache management
      shouldRefreshCache: () => {
        const { weekStartDate, lastSyncTimestamp } = get();
        const now = new Date();

        // If no cached data, refresh
        if (!weekStartDate || !lastSyncTimestamp) {
          return true;
        }

        // Check if we're in a new week
        const cachedWeekStart = new Date(weekStartDate);
        if (!isSameWeek(now, cachedWeekStart, { weekStartsOn: 1 })) {
          return true;
        }

        return false;
      },

      /**
       * Returns true if schedules are cached and less than 7 days old.
       * Used to decide whether offline check-in data is trustworthy.
       */
      hasValidScheduleCache: () => {
        const { schedulesLastFetch, schedules } = get();
        if (!schedulesLastFetch || schedules.length === 0) return false;
        return Date.now() - schedulesLastFetch < SCHEDULE_CACHE_MAX_AGE_MS;
      },

      updateLastSync: () =>
        set({
          lastSyncTimestamp: Date.now(),
          weekStartDate: startOfWeek(new Date(), {
            weekStartsOn: 1,
          }).toISOString(),
        }),

      isDataStale: (lastFetch, maxAgeMs = CACHE_DURATION_MS) => {
        if (!lastFetch) return true;
        return Date.now() - lastFetch > maxAgeMs;
      },

      // Check if todayAttendance is from a previous week
      // Keeps data cached for the entire week for better offline support
      isTodayAttendanceStale: () => {
        const { attendanceDateStr } = get();
        if (!attendanceDateStr) return true;
        const attendanceDate = new Date(attendanceDateStr);
        // Use week-based caching (Monday start) to preserve offline data
        return !isSameWeek(attendanceDate, new Date(), { weekStartsOn: 1 });
      },

      // Clear stale attendance data
      clearStaleAttendance: () => {
        const { isTodayAttendanceStale } = get();
        if (isTodayAttendanceStale()) {
          set({
            todayAttendance: [],
            attendanceDateStr: null,
            attendanceLastFetch: null,
          });
        }
      },

      // Absence sheet trigger (from push notification)
      setAbsenceSheetScheduleId: (scheduleId) =>
        set({ absenceSheetScheduleId: scheduleId }),
      clearAbsenceSheet: () => set({ absenceSheetScheduleId: null }),

      reset: () => set(initialState),
    }),
    {
      name: "academy-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        schedules: state.schedules,
        todayAttendance: state.todayAttendance,
        attendanceLastFetch: state.attendanceLastFetch,
        attendanceDateStr: state.attendanceDateStr,
        payments: state.payments,
        pendingCheckins: state.pendingCheckins,
        weekStartDate: state.weekStartDate,
        lastSyncTimestamp: state.lastSyncTimestamp,
        schedulesLastFetch: state.schedulesLastFetch,
        // earnings: excluded - should be fetched fresh to show accurate amounts
        paymentsLastFetch: state.paymentsLastFetch,
        scheduleFilter: state.scheduleFilter,
        paymentFilter: state.paymentFilter,
      }),
    },
  ),
);
