import type { UserRole } from "../types/auth";

export interface NavigationItem {
  label: string;
  path: string;
  roles?: UserRole[];
}

export const navigationItems: NavigationItem[] = [
  { label: "Главная", path: "/" },
  { label: "Проверка подлинности", path: "/verify" },
  { label: "Кабинет поставщика", path: "/supplier", roles: ["supplier", "admin"] },
  { label: "Реестр сертификатов", path: "/registry", roles: ["admin"] },
  { label: "Профиль", path: "/profile", roles: ["supplier", "admin"] },
];
