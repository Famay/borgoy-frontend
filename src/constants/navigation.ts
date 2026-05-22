import type { UserRole } from "../types/auth";

export interface NavigationItem {
  label: string;
  path: string;
  roles?: UserRole[];
}

export const navigationItems: NavigationItem[] = [
  { label: "Главная", path: "/" },
  { label: "О проекте", path: "/about" },
  { label: "Проверка подлинности", path: "/verify" },
  {
    label: "Кабинет поставщика",
    path: "/supplier",
    roles: ["supplier"],
  },
  {
    label: "Мои сертификаты",
    path: "/my-certificates",
    roles: ["supplier"],
  },
  {
    label: "Dashboard",
    path: "/admin",
    roles: ["admin"],
  },
  {
    label: "Реестр сертификатов",
    path: "/registry",
    roles: ["admin"],
  },
  {
    label: "Поставщики",
    path: "/admin/suppliers",
    roles: ["admin"],
  },
  {
    label: "Состояние системы",
    path: "/admin/status",
    roles: ["admin"],
  },
  {
    label: "Журнал аудита",
    path: "/admin/logs",
    roles: ["admin"],
  },
  { label: "Профиль", path: "/profile", roles: ["supplier", "admin"] },
];
