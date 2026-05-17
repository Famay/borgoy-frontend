export type UserRole = "guest" | "supplier" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string | null;
  status?: string;
  twoFactorEnabled?: boolean;
}
