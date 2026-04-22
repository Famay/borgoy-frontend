/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import { mockUsers } from "../data/users";
import type { AuthUser } from "../types/auth";

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => {
    success: boolean;
    user?: AuthUser;
    message?: string;
  };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_STORAGE_KEY = "vermeat.auth.user";

function readStoredUser() {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: ({ email, password }: LoginPayload) => {
        const normalizedEmail = email.trim().toLowerCase();
        const found = mockUsers.find(
          (item) =>
            item.email.toLowerCase() === normalizedEmail && item.password === password
        );

        if (!found) {
          return {
            success: false,
            message: "Неверный email или пароль",
          };
        }

        const authUser: AuthUser = {
          id: found.id,
          name: found.name,
          email: found.email,
          role: found.role,
        };

        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));

        return { success: true, user: authUser };
      },
      logout: () => {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      },
    }),
    [user]
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
