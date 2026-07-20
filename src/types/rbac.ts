export const ROLES = {
  ADMIN: "admin",
  USUARIO: "usuario",
  PRUEBA: "prueba",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  EXPIRED: "expired",
} as const;

export type UserStatus = (typeof STATUS)[keyof typeof STATUS];

export const DIAS_PRUEBA = 7;

export interface DatosSesion {
  uid: string;
  role: Role;
  status: UserStatus;
  trialExpiresAt: number | null;
}

export interface UserDoc {
  uid: string;
  displayName?: string;
  email: string;
  role: Role;
  status: UserStatus;
  onboardingCompleted: boolean;
  createdAt: FirebaseFirestore.Timestamp | null;
  trialExpiresAt: FirebaseFirestore.Timestamp | null;
  monthlyBudget?: number;
  monthlySalary?: number;
  savingsPhysical?: number;
  savingsUSDT?: number;
}

export function esAdmin(role: unknown): role is "admin" {
  return role === ROLES.ADMIN;
}

export function esPrueba(role: unknown): role is "prueba" {
  return role === ROLES.PRUEBA;
}

export function esPruebaExpirada(
  role: unknown,
  trialExpiresAt: unknown
): boolean {
  if (role !== ROLES.PRUEBA) return false;
  if (!trialExpiresAt) return false;
  const exp =
    typeof trialExpiresAt === "number"
      ? trialExpiresAt
      : trialExpiresAt instanceof Date
        ? trialExpiresAt.getTime()
        : (trialExpiresAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
  return Date.now() > exp;
}
