
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  authService,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../services/authService";


interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean; 
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}


const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(() =>
    authService.getCachedUser(),
  );

  // isLoading = we haven't finished the background token-validation yet
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const isAuthenticated = !!user && authService.isAuthenticated();

  const didValidate = useRef(false);
  useEffect(() => {
    if (didValidate.current) return;
    didValidate.current = true;

    const validate = async () => {
      const token = authService.getToken();
      if (!token) {
        // No token at all — not logged in
        setUser(null);
        setIsLoading(false);
        return;
      }
      const cached = authService.getCachedUser();
      if (cached) setUser(cached);

      try {
        const fresh = await authService.getCurrentUser();
        setUser(fresh);
      } catch {
        // Token is invalid / expired — clear everything
        await authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validate();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const login = useCallback(async (payload: LoginPayload) => {
    setIsAuthenticating(true);
    try {
      const loggedInUser = await authService.login(payload);
      setUser(loggedInUser);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsAuthenticating(true);
    try {
      const newUser = await authService.register(payload);
      setUser(newUser);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authService.getCurrentUser();
      setUser(fresh);
    } catch {
      // If refresh fails the session is gone
      await authService.logout();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAuthenticating,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
