import api from "./api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation?: string;
  mobile_number?: string;
  date_of_birth?: string;
  sa_id_number?: string;
  gender_id?: number;
  province_id?: number;
  equity_group?: string;
  disability_declaration?: "no" | "yes" | "prefer_not_to_say";
  disability_type_id?: number;
  role?: "youth" | "graduate";
}

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  name?: string;
  mobile_number?: string | null;
  date_of_birth?: string | null;
  gender_id?: number | null;
  province_id?: number | null;
  equity_group?: string | null;
  disability_declaration?: string | null;
  disability_type_id?: number | null;
  role?: string | null;
  sa_id_number?: string | null;
  income_tax_number?: string | null;
  title_id?: number | null;
  middle_names?: string | null;
  preferred_name?: string | null;
  race_id?: number | null;
  nationality_country_id?: number | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  suburb?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country_id?: number | null;
  work_phone?: string | null;
  sa_bank_id?: number | null;
  bank_branch_code?: string | null;
  bank_account_number?: string | null;
  bank_account_type?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  employee_number?: string | null;
  job_role_id?: number | null;
  job_title?: string | null;
  department_id?: number | null;
  is_department_lead?: boolean;
  contract_type_id?: number | null;
  employment_start_date?: string | null;
  probation_ends_at?: string | null;
  employment_end_date?: string | null;
  email_verified_at?: string | null;
  two_factor_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  avatar?: string;
  phone?: string;
  programme?: string;
  province?: string;
  learner_code?: string;
  cohort?: string;
  nqf_level?: string;
  seta?: string;
  programme_start?: string;
  programme_end?: string;
  full_name?: string;
  initials?: string;
  stats?: {
    attendance_pct: number;
    weeks_remaining: number;
    pending_tasks: number;
    modules_completed: number;
  };
}

interface AuthResponse {
  success?: boolean;
  access_token?: string;
  token?: string;
  token_type?: "Bearer";
  expires_in?: number;
  user: AuthUser;
  message?: string;
}

const TOKEN_KEY = "pandabot_token";
const USER_KEY = "pandabot_user";

function extractToken(data: AuthResponse): string {
  const token = data.access_token ?? data.token;
  if (!token) throw new Error("No token received from server.");
  return token;
}

function persist(token: string, user: AuthUser): AuthUser {
  const enriched: AuthUser = {
    ...user,
    full_name: user.full_name ?? `${user.first_name} ${user.last_name}`.trim(),
    initials:
      user.initials ??
      `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase(),
  };
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(enriched));
  return enriched;
}

function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function extractErrorMessage(err: any): string {
  const data = err?.response?.data;
  if (data?.errors) {
    const firstField = Object.keys(data.errors)[0];
    const firstMsg = data.errors[firstField]?.[0];
    if (firstMsg) return firstMsg;
  }
  if (data?.message) return data.message;
  if (err?.message) return err.message;
  return "Something went wrong. Please try again.";
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    try {
      const { data } = await api.post<AuthResponse>("/v1/auth/login", payload);
      if (data.success === false)
        throw new Error(data.message ?? "Login failed.");
      return persist(extractToken(data), data.user);
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async register(payload: RegisterPayload): Promise<AuthUser> {
    try {
      const { data } = await api.post<AuthResponse>(
        "/v1/auth/register",
        payload,
      );
      if (data.success === false)
        throw new Error(data.message ?? "Registration failed.");
      return persist(extractToken(data), data.user);
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await api.post(
          "/v1/auth/logout",
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
    } catch (e) {
      console.warn("Logout API error:", e);
    } finally {
      clearAuth();
    }
  },

  async getCurrentUser(): Promise<AuthUser> {
    try {
      const token = this.getToken();
      if (!token) throw new Error("Not authenticated");
      const { data } = await api.get<{ success: boolean; user: AuthUser }>(
        "/v1/auth/me",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!data.success) throw new Error("Failed to fetch user");
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (err: any) {
      if (err.response?.status === 401) clearAuth();
      throw new Error(extractErrorMessage(err));
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const { data } = await api.post<{ message: string }>(
        "/v1/auth/forgot-password",
        { email },
      );
      return data;
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async resetPassword(payload: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    try {
      const { data } = await api.post<{ message: string }>(
        "/v1/auth/reset-password",
        payload,
      );
      return data;
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const token = this.getToken();
      if (!token) throw new Error("Not authenticated");
      const { data } = await api.put(
        "/v1/auth/password",
        {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!data.success) throw new Error(data.message);
      return { message: data.message };
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async refreshToken(): Promise<string | null> {
    try {
      const currentToken = this.getToken();
      if (!currentToken) return null;
      const { data } = await api.post<{
        success: boolean;
        token?: string;
        access_token?: string;
      }>(
        "/v1/auth/refresh",
        {},
        { headers: { Authorization: `Bearer ${currentToken}` } },
      );
      if (!data.success) throw new Error("Refresh failed");
      const newToken = data.access_token ?? data.token;
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        return newToken;
      }
      return null;
    } catch {
      clearAuth();
      return null;
    }
  },

  // ─── ID Verification ────────────────────────────────────────────────────

  async checkIDVerificationStatus(): Promise<{
    success: boolean;
    is_verified: boolean;
    verified_at?: string | null;
    message?: string;
  }> {
    try {
      const token = this.getToken();
      if (!token) throw new Error("Not authenticated");
      const { data } = await api.get("/v1/auth/id/verify/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async validateIDNumber(idNumber: string): Promise<{
    success: boolean;
    message?: string;
    extracted_info?: {
      full_name?: string;
      date_of_birth?: string;
      gender?: string;
      citizenship?: string;
    };
  }> {
    try {
      const token = this.getToken();
      if (!token) throw new Error("Not authenticated");
      const { data } = await api.post(
        "/v1/auth/id/validate",
        { sa_id_number: idNumber },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data;
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async verifyID(idNumber: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const token = this.getToken();
      if (!token) throw new Error("Not authenticated");
      const { data } = await api.post(
        "/v1/auth/id/verify",
        { sa_id_number: idNumber, confirm_id_number: idNumber },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data;
    } catch (err: any) {
      throw new Error(extractErrorMessage(err));
    }
  },

  // ─── Local helpers ──────────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCachedUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
