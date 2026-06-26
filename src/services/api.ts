import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

export const BASE_URL = 'https://work.skillspanda.co.za/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15_000,
});

// ── Request: attach Bearer token ─────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('pandabot_token');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Response: handle 401 globally ────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pandabot_token');
      localStorage.removeItem('pandabot_user');
      // Force re-render to login (AuthContext will pick this up)
      window.dispatchEvent(new Event('pandabot:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/** Safely extract the `message` from a Laravel validation / error response */
export const getApiError = (err: unknown): string => {
  const e = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const body = e?.response?.data;
  if (body?.errors) {
    // First validation error
    const firstField = Object.values(body.errors)[0];
    if (firstField?.length) return firstField[0];
  }
  return body?.message ?? 'Something went wrong. Please try again.';
};

export default api;
