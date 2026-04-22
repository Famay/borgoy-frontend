import type { UserRole } from "../types/auth";

export function getDefaultRouteForRole(role: UserRole) {
  if (role === "admin") {
    return "/registry";
  }

  if (role === "supplier") {
    return "/supplier";
  }

  return "/";
}
