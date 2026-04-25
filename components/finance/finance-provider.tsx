"use client";

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { initialFinanceState, isLegacyDemoState } from "@/lib/finance/defaults";
import { summarizeDashboard } from "@/lib/finance/utils";
import {
  calculatePayableStatus,
  calculateReceivableState,
  dateToMonthName,
  todayIso,
} from "@/lib/finance/utils";
import { FinanceState, Movement, Payable, Receivable } from "@/lib/finance/types";

const STORAGE_KEY = "decorazon-finanzas-v1";

interface FinanceContextValue extends FinanceState {
  dashboard: ReturnType<typeof summarizeDashboard>;
  addMovement: (movement: Omit<Movement, "id" | "month" | "createdAt">) => void;
  updateMovement: (
    id: string,
    movement: Omit<Movement, "id" | "month" | "createdAt">,
  ) => void;
  deleteMovement: (id: string) => void;
  addReceivable: (receivable: Omit<Receivable, "id" | "balance" | "status" | "createdAt">) => void;
  updateReceivable: (
    id: string,
    receivable: Omit<Receivable, "id" | "balance" | "status" | "createdAt">,
  ) => void;
  markReceivableAsPaid: (id: string, paidDate: string) => void;
  deleteReceivable: (id: string) => void;
  addPayable: (payable: Omit<Payable, "id" | "createdAt">) => void;
  updatePayable: (id: string, payable: Omit<Payable, "id" | "createdAt">) => void;
  markPayableAsPaid: (id: string, paidDate: string) => void;
  deletePayable: (id: string) => void;
  addCategory: (type: "income" | "expense", value: string) => void;
  removeCategory: (type: "income" | "expense", value: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function parseStoredState(raw: string): FinanceState {
  const parsed = JSON.parse(raw) as Partial<FinanceState>;
  const state: FinanceState = {
    movements: parsed.movements ?? [],
    receivables: parsed.receivables ?? [],
    payables: parsed.payables ?? [],
    settings: parsed.settings ?? initialFinanceState.settings,
  };

  if (state.movements.length === 0 || isLegacyDemoState(state)) {
    return {
      ...state,
      movements: initialFinanceState.movements,
    };
  }

  return state;
}

export function FinanceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<FinanceState>(() => {
    if (typeof window === "undefined") {
      return initialFinanceState;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? parseStoredState(raw) : initialFinanceState;
    } catch {
      return initialFinanceState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<FinanceContextValue>(() => {
    const addMovement: FinanceContextValue["addMovement"] = (movement) => {
      setState((prev) => ({
        ...prev,
        movements: [
          {
            ...movement,
            id: createId("mov"),
            month: dateToMonthName(movement.date),
            createdAt: new Date().toISOString(),
          },
          ...prev.movements,
        ],
      }));
    };

    const updateMovement: FinanceContextValue["updateMovement"] = (id, movement) => {
      setState((prev) => ({
        ...prev,
        movements: prev.movements.map((item) =>
          item.id === id
            ? { ...item, ...movement, month: dateToMonthName(movement.date) }
            : item,
        ),
      }));
    };

    const deleteMovement: FinanceContextValue["deleteMovement"] = (id) => {
      setState((prev) => ({
        ...prev,
        movements: prev.movements.filter((item) => item.id !== id),
      }));
    };

    const addReceivable: FinanceContextValue["addReceivable"] = (receivable) => {
      const computed = calculateReceivableState(
        receivable.totalAmount,
        receivable.paidAmount,
        receivable.commitmentDate,
      );

      setState((prev) => ({
        ...prev,
        receivables: [
          {
            ...receivable,
            ...computed,
            id: createId("cxr"),
            createdAt: new Date().toISOString(),
          },
          ...prev.receivables,
        ],
      }));
    };

    const updateReceivable: FinanceContextValue["updateReceivable"] = (id, receivable) => {
      const computed = calculateReceivableState(
        receivable.totalAmount,
        receivable.paidAmount,
        receivable.commitmentDate,
      );

      setState((prev) => ({
        ...prev,
        receivables: prev.receivables.map((item) =>
          item.id === id ? { ...item, ...receivable, ...computed } : item,
        ),
      }));
    };

    const markReceivableAsPaid: FinanceContextValue["markReceivableAsPaid"] = (id, paidDate) => {
      setState((prev) => {
        const target = prev.receivables.find((item) => item.id === id);
        if (!target || target.balance <= 0) {
          return prev;
        }

        const paymentAmount = target.balance;

        return {
          ...prev,
          receivables: prev.receivables.map((item) =>
            item.id === id
              ? {
                  ...item,
                  paidAmount: item.totalAmount,
                  balance: 0,
                  status: "pagado",
                }
              : item,
          ),
          movements: [
            {
              id: createId("mov"),
              type: "ingreso",
              date: paidDate || todayIso(),
              month: dateToMonthName(paidDate || todayIso()),
              description: `Pago de cuenta por cobrar - ${target.client}`,
              category: "Pago final",
              amount: paymentAmount,
              clientOrProvider: target.client,
              notes: target.project,
              createdAt: new Date().toISOString(),
            },
            ...prev.movements,
          ],
        };
      });
    };

    const deleteReceivable: FinanceContextValue["deleteReceivable"] = (id) => {
      setState((prev) => ({
        ...prev,
        receivables: prev.receivables.filter((item) => item.id !== id),
      }));
    };

    const addPayable: FinanceContextValue["addPayable"] = (payable) => {
      setState((prev) => ({
        ...prev,
        payables: [
          {
            ...payable,
            id: createId("cxp"),
            status: calculatePayableStatus(payable.dueDate, payable.status),
            createdAt: new Date().toISOString(),
          },
          ...prev.payables,
        ],
      }));
    };

    const updatePayable: FinanceContextValue["updatePayable"] = (id, payable) => {
      setState((prev) => ({
        ...prev,
        payables: prev.payables.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payable,
                status: calculatePayableStatus(payable.dueDate, payable.status),
              }
            : item,
        ),
      }));
    };

    const markPayableAsPaid: FinanceContextValue["markPayableAsPaid"] = (id, paidDate) => {
      setState((prev) => {
        const target = prev.payables.find((item) => item.id === id);
        if (!target || target.status === "pagado") {
          return prev;
        }

        return {
          ...prev,
          payables: prev.payables.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "pagado",
                }
              : item,
          ),
          movements: [
            {
              id: createId("mov"),
              type: "gasto",
              date: paidDate || todayIso(),
              month: dateToMonthName(paidDate || todayIso()),
              description: `Pago de cuenta por pagar - ${target.provider}`,
              category: "Proveedores",
              amount: target.amount,
              clientOrProvider: target.provider,
              notes: target.concept,
              createdAt: new Date().toISOString(),
            },
            ...prev.movements,
          ],
        };
      });
    };

    const deletePayable: FinanceContextValue["deletePayable"] = (id) => {
      setState((prev) => ({
        ...prev,
        payables: prev.payables.filter((item) => item.id !== id),
      }));
    };

    const addCategory: FinanceContextValue["addCategory"] = (type, value) => {
      const cleanValue = value.trim();
      if (!cleanValue) {
        return;
      }

      setState((prev) => {
        if (type === "income") {
          if (prev.settings.incomeCategories.includes(cleanValue)) {
            return prev;
          }
          return {
            ...prev,
            settings: {
              ...prev.settings,
              incomeCategories: [...prev.settings.incomeCategories, cleanValue],
            },
          };
        }

        if (prev.settings.expenseCategories.includes(cleanValue)) {
          return prev;
        }
        return {
          ...prev,
          settings: {
            ...prev.settings,
            expenseCategories: [...prev.settings.expenseCategories, cleanValue],
          },
        };
      });
    };

    const removeCategory: FinanceContextValue["removeCategory"] = (type, value) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          incomeCategories:
            type === "income"
              ? prev.settings.incomeCategories.filter((item) => item !== value)
              : prev.settings.incomeCategories,
          expenseCategories:
            type === "expense"
              ? prev.settings.expenseCategories.filter((item) => item !== value)
              : prev.settings.expenseCategories,
        },
      }));
    };

    return {
      ...state,
      dashboard: summarizeDashboard(state),
      addMovement,
      updateMovement,
      deleteMovement,
      addReceivable,
      updateReceivable,
      markReceivableAsPaid,
      deleteReceivable,
      addPayable,
      updatePayable,
      markPayableAsPaid,
      deletePayable,
      addCategory,
      removeCategory,
    };
  }, [state]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used inside FinanceProvider");
  }
  return context;
}

