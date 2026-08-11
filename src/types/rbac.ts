export const ROLES = {
  ADMIN: "admin",
  USUARIO: "usuario",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface DatosSesion {
  uid: string;
  role: Role;
}

export interface UserDoc {
  uid: string;
  displayName?: string;
  email: string;
  role: Role;
  onboardingCompleted: boolean;
  createdAt: TimestampValue | null;
  monthlyBudget?: number;
  monthlySalary?: number;
  savingsPhysical?: number;
  savingsUSDT?: number;
}

export type TimestampValue = {
  _seconds: number;
  _nanoseconds: number;
  toMillis: () => number;
};

export function esAdmin(role: unknown): role is "admin" {
  return role === ROLES.ADMIN;
}