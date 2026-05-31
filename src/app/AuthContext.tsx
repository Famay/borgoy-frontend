/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiRequestError,
  getCurrentUserRequest,
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
  emailMasked?: string;
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
    const parsed = JSON.parse(storedSession) as Partial<AuthSession>;

    if (
      typeof parsed.token !== "string" ||
      !parsed.user ||
      typeof parsed.user.id !== "string" ||
      typeof parsed.user.name !== "string" ||
      typeof parsed.user.email !== "string" ||
      (parsed.user.role !== "supplier" && parsed.user.role !== "admin")
    ) {
      throw new Error("Invalid stored session");
    }

    return parsed as AuthSession;
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
  const sessionToken = session?.token;

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    let isActive = true;

    getCurrentUserRequest(sessionToken)
      .then((user) => {
        if (!isActive) {
          return;
        }

        setSession((currentSession) => {
          if (!currentSession || currentSession.token !== sessionToken) {
            return currentSession;
          }

          const nextSession = { ...currentSession, user };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
          return nextSession;
        });
      })
      .catch((error: unknown) => {
        if (
          isActive &&
          error instanceof ApiRequestError &&
          (error.statusCode === 401 || error.statusCode === 403)
        ) {
          setSession(null);
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      });

    return () => {
      isActive = false;
    };
  }, [sessionToken]);

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
              emailMasked: result.emailMasked,
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
          const result = await registerRequest(payload);

          return { success: true, user: result.user };
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
