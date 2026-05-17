import type { UserRole } from "../types/auth";

export interface NavigationItem {
  label: string;
  path: string;
  roles?: UserRole[];
}

export const navigationItems: NavigationItem[] = [
  { label: "Главная", path: "/" },
  { label: "Проверка подлинности", path: "/verify" },
  {
    label: "Кабинет поставщика",
    path: "/supplier",
    roles: ["supplier", "admin"],
  },
  {
    label: "Мои сертификаты",
    path: "/my-certificates",
    roles: ["supplier"],
  },
  {
    label: "Реестр сертификатов",
    path: "/registry",
    roles: ["admin"],
  },
  {
    label: "Журнал аудита",
    path: "/admin/logs",
    roles: ["admin"],
  },
  { label: "Профиль", path: "/profile", roles: ["supplier", "admin"] },
];
