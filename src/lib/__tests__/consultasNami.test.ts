import { describe, it, expect } from 'vitest';
import { ejecutarConsultaNami } from '../consultasNami';

const ctx = {
  balance: 100,
  monthlyExpense: 40,
  monthlyIncome: 60,
  monthlyBudget: 200,
  topCategories: [{ category: 'Comida', amount: 25 }],
  debts: [{ person: 'Ana', amount: 10 }],
  goals: [{ name: 'Viaje', current: 50, target: 100 }],
};

describe('ejecutarConsultaNami', () => {
  it('devuelve balance real del contexto', () => {
    const r = ejecutarConsultaNami({ queryType: 'balance' }, ctx);
    expect(r).toContain('100');
  });

  it('devuelve resumen con ingresos y gastos', () => {
    const r = ejecutarConsultaNami({ queryType: 'summary' }, ctx);
    expect(r).toContain('60');
    expect(r).toContain('40');
  });
});
