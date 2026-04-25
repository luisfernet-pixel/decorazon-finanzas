import { FinanceState, Payable, Receivable } from "@/lib/finance/types";

const monthFormatter = new Intl.DateTimeFormat("es-BO", { month: "long" });

export function formatBs(value: number): string {
  return `Bs ${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function dateToMonthName(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return monthFormatter.format(parsed).toLowerCase();
}

export function monthKey(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function daysUntil(date: string): number {
  const due = new Date(`${date}T00:00:00`).getTime();
  const today = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

export function calculateReceivableState(
  totalAmount: number,
  paidAmount: number,
  commitmentDate: string,
): { balance: number; status: Receivable["status"] } {
  const balance = Math.max(totalAmount - paidAmount, 0);
  if (balance <= 0) {
    return { balance, status: "pagado" };
  }

  if (daysUntil(commitmentDate) < 0) {
    return { balance, status: "vencido" };
  }

  if (paidAmount > 0) {
    return { balance, status: "parcial" };
  }

  return { balance, status: "pendiente" };
}

export function calculatePayableStatus(
  dueDate: string,
  status: Payable["status"],
): Payable["status"] {
  if (status === "pagado") {
    return status;
  }

  return daysUntil(dueDate) < 0 ? "vencido" : "pendiente";
}

export function summarizeDashboard(state: FinanceState) {
  const month = currentMonthKey();
  let income = 0;
  let expense = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  for (const movement of state.movements) {
    const isIncome = movement.type === "ingreso";
    if (isIncome) {
      income += movement.amount;
    } else {
      expense += movement.amount;
    }

    if (monthKey(movement.date) === month) {
      if (isIncome) {
        monthlyIncome += movement.amount;
      } else {
        monthlyExpense += movement.amount;
      }
    }
  }

  const receivables = state.receivables
    .filter((item) => item.status !== "pagado")
    .reduce((acc, item) => acc + item.balance, 0);

  const payables = state.payables
    .filter((item) => item.status !== "pagado")
    .reduce((acc, item) => acc + item.amount, 0);

  return {
    currentBalance: income - expense,
    monthlyIncome,
    monthlyExpense,
    monthlyProfit: monthlyIncome - monthlyExpense,
    receivables,
    payables,
  };
}

