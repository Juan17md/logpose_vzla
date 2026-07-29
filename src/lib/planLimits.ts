export interface PlanLimits {
  maxAccounts: number;
  maxTransactionsPerMonth: number;
  maxGoals: number;
  maxDebts: number;
  maxFixedExpenses: number;
  maxShoppingLists: number;
  namiDailyQueries: number;
  multiCurrency: boolean;
  customCategories: boolean;
  exportData: boolean;
  comisionesVE: boolean;
  fullReports: boolean;
}

export const LIMITES_FREE: PlanLimits = {
  maxAccounts: 2,
  maxTransactionsPerMonth: 50,
  maxGoals: 1,
  maxDebts: 5,
  maxFixedExpenses: 5,
  maxShoppingLists: 3,
  namiDailyQueries: 15,
  multiCurrency: false,
  customCategories: false,
  exportData: false,
  comisionesVE: false,
  fullReports: false,
};

export const LIMITES_PREMIUM: PlanLimits = {
  maxAccounts: Infinity,
  maxTransactionsPerMonth: Infinity,
  maxGoals: Infinity,
  maxDebts: Infinity,
  maxFixedExpenses: Infinity,
  maxShoppingLists: Infinity,
  namiDailyQueries: Infinity,
  multiCurrency: true,
  customCategories: true,
  exportData: true,
  comisionesVE: true,
  fullReports: true,
};

export function obtenerLimitesPlan(plan: string | undefined): PlanLimits {
  if (plan === "premium") return LIMITES_PREMIUM;
  return LIMITES_FREE;
}
