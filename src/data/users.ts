import type { AuthUser } from "../types/auth";

export interface MockUserRecord extends AuthUser {
  password: string;
}

export const mockUsers: MockUserRecord[] = [
  {
    id: "1",
    name: "Андрей Иванов",
    email: "supplier@vermeat.ru",
    password: "supplier123",
    role: "supplier",
  },
  {
    id: "2",
    name: "Администратор VerMeat",
    email: "admin@vermeat.ru",
    password: "admin123",
    role: "admin",
  },
];
