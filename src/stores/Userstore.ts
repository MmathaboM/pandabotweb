// src/store/userStore.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Demographics, PersonalInfo, UserProgram } from "../types/profile";

// ── User shape ────────────────────────────────────────────────────────────────
export interface User {
  uid: string;
  id?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
  // Extended fields
  studentNumber?: string;
  isLearner?: boolean;
  isEmployee?: boolean;
  isAlumni?: boolean;
  isActive?: boolean;
  programs?: UserProgram[];
  hasActiveSchedule?: boolean;
  activeScheduleCount?: number;
  checkedInToday?: boolean;
  pendingPayments?: number;
  hasBankAccount?: boolean;
  profileCompletion?: number;
  demographics?: Demographics;
  personalInfo?: PersonalInfo;
}

// ── Store shape ───────────────────────────────────────────────────────────────
interface UserState {
  user: User | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  setTokens: (tokens: UserState["tokens"]) => void;
  logout: () => void;
}

// ── Admin email domains ───────────────────────────────────────────────────────
/**
 * Admin email domains that have elevated chat permissions.
 * Users with these domains can:
 * - Chat with anyone (no mutual follow required)
 * - Create group chats
 */
const ADMIN_EMAIL_DOMAINS = ["skillspanda.co.za", "connecthr.co.za"];

/**
 * Check if an email belongs to an admin domain
 */
export const isAdminEmailDomain = (email: string | undefined): boolean => {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return ADMIN_EMAIL_DOMAINS.includes(domain ?? "");
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setTokens: (tokens) => set({ tokens }),

      logout: () => set({ user: null, tokens: null, isAuthenticated: false }),
    }),
    {
      name: "user-storage",
      // Web: use localStorage instead of AsyncStorage
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ── Selector hooks ────────────────────────────────────────────────────────────

/**
 * Hook to check if current user has admin email domain.
 * Returns true if user can create groups/forums and chat with anyone.
 */
export const useIsAdminUser = (): boolean => {
  const user = useUserStore((state) => state.user);
  return isAdminEmailDomain(user?.email);
};

/**
 * Hook to get profile completion percentage
 */
export const useProfileCompletion = (): number => {
  const user = useUserStore((state) => state.user);
  return user?.profileCompletion ?? 0;
};

/**
 * Hook to check if user has completed QCTO required fields
 */
export const useHasCompletedQCTO = (): boolean => {
  const user = useUserStore((state) => state.user);
  if (!user?.demographics) return false;

  const { birth_date, gender, race_id, nationality } = user.demographics as any;
  return !!(birth_date && gender && race_id && nationality);
};

/**
 * Check if user has @skillspanda.co.za email
 */
export const isSkillsPandaEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === "skillspanda.co.za";
};

/**
 * Hook to check if user can access BizApp.
 * BizApp is only accessible to:
 * - Users with @skillspanda.co.za email
 * - Alumni users
 */
export const useCanAccessBizApp = (): boolean => {
  const user = useUserStore((state) => state.user);
  if (!user) return false;
  if (isSkillsPandaEmail(user.email)) return true;
  if (user.isAlumni) return true;
  return false;
};

/**
 * Hook to check if user can access Academy.
 * Academy is only accessible to:
 * - Users with @skillspanda.co.za email
 * - Users with role "student"
 */
export const userCanAccessAcademy = (): boolean => {
  const user = useUserStore((state) => state.user);
  if (!user) return false;
  if (isSkillsPandaEmail(user.email)) return true;
  if (user.role?.toLowerCase() === "student") return true;
  if (user.roles?.some((r) => r.toLowerCase() === "student")) return true;
  if (user.isLearner) return true;
  return false;
};
