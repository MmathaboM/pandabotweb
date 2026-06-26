import api from "./api";
import type { AuthUser } from "./authService";

const USER_KEY = "pandabot_user";

const unwrap = <T>(raw: any): T => (raw?.data !== undefined ? raw.data : raw);

const buildUser = (user: AuthUser): AuthUser => ({
  ...user,
  full_name:
    user.full_name ?? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
  initials:
    user.initials ??
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase(),
});

export const userService = {
  async getProfile(): Promise<AuthUser> {
    const { data } = await api.get("/v1/auth/me");
    const raw = unwrap<AuthUser>(data);
    const user = buildUser(raw);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  // hits /v1/chat/users — we'll add this Laravel route below
  async getUsers(search?: string): Promise<AuthUser[]> {
    const { data } = await api.get("/v1/chat/users", {
      params: search ? { search } : {},
    });
    const list = unwrap<AuthUser[]>(data);
    return list.map(buildUser);
  },

  async updateProfile(payload: Partial<AuthUser>): Promise<AuthUser> {
    const { data } = await api.put("/v1/user/profile", payload);
    const user = buildUser(unwrap<AuthUser>(data));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const form = new FormData();
    form.append("avatar", file);
    const { data } = await api.post("/v1/user/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap<{ avatar_url: string }>(data);
  },
};
