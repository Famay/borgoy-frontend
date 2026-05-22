import type { UserRole } from "../types/auth";

export function getDefaultRouteForRole(role: UserRole) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "supplier") {
    return "/supplier";
  }

  return "/";
}
