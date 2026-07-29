export const ROLES = {
  ADMIN: "admin",
  USUARIO: "usuario",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  EXPIRED: "expired",
} as const;

export type UserStatus = (typeof STATUS)[keyof typeof STATUS];

export const PLANES = {
  FREE: "free",
  PREMIUM: "premium",
} as const;

export type Plan = (typeof PLANES)[keyof typeof PLANES];

export const DIAS_PRUEBA = 14;

export interface DatosSesion {
  uid: string;
  role: Role;
  plan: Plan;
  status: UserStatus;
  trialExpiresAt: number | null;
}

export interface UserDoc {
  uid: string;
  displayName?: string;
  email: string;
  role: Role;
  plan: Plan;
  status: UserStatus;
  onboardingCompleted: boolean;
  createdAt: TimestampValue | null;
  trialExpiresAt: TimestampValue | null;
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

export function esPremium(plan: unknown): plan is "premium" {
  return plan === PLANES.PREMIUM;
}

function extraerMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "string") return new Date(ts).getTime();
  return (ts as { toMillis?: () => number })?.toMillis?.() ?? 0;
}

export function esTrialActivo(
  trialExpiresAt: unknown,
  plan?: unknown
): boolean {
  if (plan === PLANES.PREMIUM) return true;
  if (!trialExpiresAt) return false;
  return Date.now() < extraerMillis(trialExpiresAt);
}
