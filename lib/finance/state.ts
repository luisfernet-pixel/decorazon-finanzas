import { defaultSettings, initialFinanceState, isLegacyDemoState } from "@/lib/finance/defaults";
import { FinanceState } from "@/lib/finance/types";

function normalizeCategories(input: unknown, fallback: string[]): string[] {
  const values = Array.isArray(input)
    ? input.map((item) => String(item).trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...values, ...fallback]));
}

export function normalizeFinanceState(input: Partial<FinanceState> | null | undefined): FinanceState {
  const parsed = input ?? {};

  const state: FinanceState = {
    movements: Array.isArray(parsed.movements) ? parsed.movements : [],
    receivables: Array.isArray(parsed.receivables) ? parsed.receivables : [],
    payables: Array.isArray(parsed.payables) ? parsed.payables : [],
    settings: {
      incomeCategories: normalizeCategories(
        parsed.settings?.incomeCategories,
        defaultSettings.incomeCategories,
      ),
      expenseCategories: normalizeCategories(
        parsed.settings?.expenseCategories,
        defaultSettings.expenseCategories,
      ),
      closedMonths: normalizeCategories(parsed.settings?.closedMonths, defaultSettings.closedMonths),
      lastBackupAt:
        typeof parsed.settings?.lastBackupAt === "string" && parsed.settings.lastBackupAt.trim()
          ? parsed.settings.lastBackupAt
          : defaultSettings.lastBackupAt,
    },
  };

  if (state.movements.length === 0 || isLegacyDemoState(state)) {
    return {
      ...state,
      movements: initialFinanceState.movements,
    };
  }

  return state;
}

export function parseFinanceState(raw: string): FinanceState {
  return normalizeFinanceState(JSON.parse(raw) as Partial<FinanceState>);
}
