/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import {
  loginRequest,
  registerRequest,
  verifyTwoFactorLoginRequest,
  type RegisterPayload,
} from "../services/api";
import type { AuthUser } from "../types/auth";

interface LoginPayload {
  email: string;
  password: string;
}

interface TwoFactorLoginPayload {
  challengeToken: string;
  code: string;
}

interface AuthResult {
  success: boolean;
  user?: AuthUser;
  message?: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  phoneMasked?: string;
}

interface AuthSession {
  user: AuthUser;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthResult>;
  verifyTwoFactorLogin: (payload: TwoFactorLoginPayload) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_STORAGE_KEY = "vermeat.auth.session";

function readStoredSession() {
  const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession) as AuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    readStoredSession()
  );

  const persistSession = (nextSession: AuthSession) => {
    setSession(nextSession);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
  };

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      login: async ({ email, password }: LoginPayload) => {
        try {
          const result = await loginRequest(email, password);

          if (result.twoFactorRequired) {
            return {
              success: false,
              twoFactorRequired: true,
              challengeToken: result.challengeToken,
              phoneMasked: result.phoneMasked,
            };
          }

          persistSession({ user: result.user, token: result.token });

          return { success: true, user: result.user };
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error ? error.message : "Ошибка входа в систему",
          };
        }
      },
      verifyTwoFactorLogin: async ({
        challengeToken,
        code,
      }: TwoFactorLoginPayload) => {
        try {
          const nextSession = await verifyTwoFactorLoginRequest(
            challengeToken,
            code
          );
          persistSession(nextSession);

          return { success: true, user: nextSession.user };
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Ошибка подтверждения второго фактора",
          };
        }
      },
      register: async (payload: RegisterPayload) => {
        try {
          const nextSession = await registerRequest(payload);
          persistSession(nextSession);

          return { success: true, user: nextSession.user };
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Ошибка регистрации поставщика",
          };
        }
      },
      updateUser: (user: AuthUser) => {
        if (!session) {
          return;
        }

        persistSession({ ...session, user });
      },
      logout: () => {
        setSession(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      },
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
