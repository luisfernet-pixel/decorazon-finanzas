"use client";

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { initialFinanceState } from "@/lib/finance/defaults";
import {
  calculatePayableStatus,
  calculateReceivableState,
  dateToMonthName,
  monthKey,
  summarizeDashboard,
  todayIso,
} from "@/lib/finance/utils";
import { FinanceState, Movement, Payable, Receivable } from "@/lib/finance/types";
import { normalizeFinanceState, parseFinanceState } from "@/lib/finance/state";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const STORAGE_KEY = "decorazon-finanzas-v1";
const FINANCE_STATE_ROW_ID = "main";
const FINANCE_STATE_TABLE = "finance_state";

interface FinanceContextValue extends FinanceState {
  dashboard: ReturnType<typeof summarizeDashboard>;
  noticeMessage: string;
  notify: (message: string) => void;
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
  closeMonth: (month: string) => void;
  openMonth: (month: string) => void;
  isMonthClosed: (month: string) => boolean;
  replaceMovements: (movements: Movement[]) => void;
  replaceFinanceData: (payload: {
    movements?: Movement[];
    receivables?: Receivable[];
    payables?: Payable[];
  }) => void;
  markBackupCompleted: () => void;
  exportBackup: () => string;
  importBackup: (raw: string) => { ok: boolean; error?: string };
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function readLocalBackup(): FinanceState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseFinanceState(raw);
  } catch {
    return null;
  }
}

export function FinanceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<FinanceState>(initialFinanceState);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const stateRef = useRef(state);
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeEnabled = isSupabaseConfigured();

  const notify = (message: string) => {
    setNoticeMessage(message);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setNoticeMessage("");
      noticeTimerRef.current = null;
    }, 2200);
  };

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(
    () => () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const bootstrap = async () => {
      const localBackup = readLocalBackup();
      const supabase = getSupabaseBrowserClient();

      if (!realtimeEnabled || !supabase) {
        if (localBackup) {
          setState(localBackup);
        }
        setDataLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from(FINANCE_STATE_TABLE)
          .select("state")
          .eq("id", FINANCE_STATE_ROW_ID)
          .maybeSingle<{ state: Partial<FinanceState> }>();

        if (error) {
          throw error;
        }

        if (data?.state) {
          const remoteState = normalizeFinanceState(data.state);
          const snapshot = JSON.stringify(remoteState);
          lastRemoteSnapshotRef.current = snapshot;
          isApplyingRemoteRef.current = true;
          setState(remoteState);
        } else {
          const seedState = localBackup ?? initialFinanceState;
          const normalizedSeed = normalizeFinanceState(seedState);
          await supabase.from(FINANCE_STATE_TABLE).upsert(
            {
              id: FINANCE_STATE_ROW_ID,
              state: normalizedSeed,
            },
            { onConflict: "id" },
          );
          const snapshot = JSON.stringify(normalizedSeed);
          lastRemoteSnapshotRef.current = snapshot;
          setState(normalizedSeed);
        }
      } catch {
        if (localBackup) {
          setState(localBackup);
        }
      } finally {
        setDataLoaded(true);
      }
    };

    void bootstrap();
  }, [realtimeEnabled]);

  useEffect(() => {
    if (!dataLoaded) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [dataLoaded, state]);

  useEffect(() => {
    if (!dataLoaded || !realtimeEnabled) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("finance-state-main")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: FINANCE_STATE_TABLE,
          filter: `id=eq.${FINANCE_STATE_ROW_ID}`,
        },
        (payload) => {
          const nextState = (payload.new as { state?: Partial<FinanceState> } | null)?.state;
          if (!nextState) {
            return;
          }
          const normalized = normalizeFinanceState(nextState);
          const remoteSnapshot = JSON.stringify(normalized);
          const localSnapshot = JSON.stringify(stateRef.current);
          lastRemoteSnapshotRef.current = remoteSnapshot;

          if (remoteSnapshot !== localSnapshot) {
            isApplyingRemoteRef.current = true;
            setState(normalized);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dataLoaded, realtimeEnabled]);

  useEffect(() => {
    if (!dataLoaded || !realtimeEnabled) {
      return;
    }

    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    const localSnapshot = JSON.stringify(state);
    if (localSnapshot === lastRemoteSnapshotRef.current) {
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const pushState = async () => {
      try {
        const { data, error } = await supabase
          .from(FINANCE_STATE_TABLE)
          .upsert(
            {
              id: FINANCE_STATE_ROW_ID,
              state,
            },
            { onConflict: "id" },
          )
          .select("state")
          .single<{ state: Partial<FinanceState> }>();

        if (error || cancelled) {
          return;
        }

        const normalized = normalizeFinanceState(data?.state);
        const remoteSnapshot = JSON.stringify(normalized);
        lastRemoteSnapshotRef.current = remoteSnapshot;

        if (remoteSnapshot !== localSnapshot) {
          isApplyingRemoteRef.current = true;
          setState(normalized);
        }
      } catch {
        // Keep local data and retry on next change.
      }
    };

    void pushState();
    return () => {
      cancelled = true;
    };
  }, [dataLoaded, realtimeEnabled, state]);

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
      }
      try {
        const parsed = parseFinanceState(event.newValue);
        const snapshot = JSON.stringify(parsed);
        lastRemoteSnapshotRef.current = snapshot;
        isApplyingRemoteRef.current = true;
        setState(parsed);
      } catch {
        // Ignore malformed values written from other tabs/windows.
      }
    };

    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const value = useMemo<FinanceContextValue>(() => {
    const isDateClosed = (date: string) => state.settings.closedMonths.includes(monthKey(date));

    const addMovement: FinanceContextValue["addMovement"] = (movement) => {
      if (isDateClosed(movement.date)) {
        return;
      }
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
      notify(`${movement.type === "ingreso" ? "Ingreso" : "Egreso"} guardado.`);
    };

    const updateMovement: FinanceContextValue["updateMovement"] = (id, movement) => {
      const current = state.movements.find((item) => item.id === id);
      if (!current || isDateClosed(current.date) || isDateClosed(movement.date)) {
        return;
      }
      setState((prev) => {
        return {
          ...prev,
          movements: prev.movements.map((item) =>
            item.id === id
              ? { ...item, ...movement, month: dateToMonthName(movement.date) }
              : item,
          ),
        };
      });
      notify(`${movement.type === "ingreso" ? "Ingreso" : "Egreso"} actualizado.`);
    };

    const deleteMovement: FinanceContextValue["deleteMovement"] = (id) => {
      setState((prev) => {
        const current = prev.movements.find((item) => item.id === id);
        if (!current || isDateClosed(current.date)) {
          return prev;
        }
        return {
          ...prev,
          movements: prev.movements.filter((item) => item.id !== id),
        };
      });
    };

    const addReceivable: FinanceContextValue["addReceivable"] = (receivable) => {
      if (isDateClosed(receivable.commitmentDate)) {
        return;
      }
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
      notify("Cuenta por cobrar guardada.");
    };

    const updateReceivable: FinanceContextValue["updateReceivable"] = (id, receivable) => {
      const current = state.receivables.find((item) => item.id === id);
      if (
        !current ||
        isDateClosed(current.commitmentDate) ||
        isDateClosed(receivable.commitmentDate)
      ) {
        return;
      }
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
      notify("Cuenta por cobrar actualizada.");
    };

    const markReceivableAsPaid: FinanceContextValue["markReceivableAsPaid"] = (id, paidDate) => {
      setState((prev) => {
        const target = prev.receivables.find((item) => item.id === id);
        const effectiveDate = paidDate || todayIso();
        if (
          !target ||
          target.balance <= 0 ||
          isDateClosed(effectiveDate)
        ) {
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
              date: effectiveDate,
              month: dateToMonthName(effectiveDate),
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
      setState((prev) => {
        const target = prev.receivables.find((item) => item.id === id);
        if (
          !target ||
          (target.status !== "pagado" && isDateClosed(target.commitmentDate))
        ) {
          return prev;
        }
        return {
          ...prev,
          receivables: prev.receivables.filter((item) => item.id !== id),
        };
      });
    };

    const addPayable: FinanceContextValue["addPayable"] = (payable) => {
      if (isDateClosed(payable.dueDate)) {
        return;
      }
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
      notify("Cuenta por pagar guardada.");
    };

    const updatePayable: FinanceContextValue["updatePayable"] = (id, payable) => {
      const current = state.payables.find((item) => item.id === id);
      if (!current || isDateClosed(current.dueDate) || isDateClosed(payable.dueDate)) {
        return;
      }
      setState((prev) => {
        return {
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
        };
      });
      notify("Cuenta por pagar actualizada.");
    };

    const markPayableAsPaid: FinanceContextValue["markPayableAsPaid"] = (id, paidDate) => {
      setState((prev) => {
        const target = prev.payables.find((item) => item.id === id);
        const effectiveDate = paidDate || todayIso();
        if (
          !target ||
          target.status === "pagado" ||
          isDateClosed(effectiveDate)
        ) {
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
              date: effectiveDate,
              month: dateToMonthName(effectiveDate),
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
      setState((prev) => {
        const target = prev.payables.find((item) => item.id === id);
        if (
          !target ||
          (target.status !== "pagado" && isDateClosed(target.dueDate))
        ) {
          return prev;
        }
        return {
          ...prev,
          payables: prev.payables.filter((item) => item.id !== id),
        };
      });
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
              ? prev.settings.incomeCategories.length <= 1
                ? prev.settings.incomeCategories
                : prev.settings.incomeCategories.filter((item) => item !== value)
              : prev.settings.incomeCategories,
          expenseCategories:
            type === "expense"
              ? prev.settings.expenseCategories.length <= 1
                ? prev.settings.expenseCategories
                : prev.settings.expenseCategories.filter((item) => item !== value)
              : prev.settings.expenseCategories,
        },
      }));
    };

    const closeMonth: FinanceContextValue["closeMonth"] = (month) => {
      const cleanMonth = month.trim();
      if (!cleanMonth) {
        return;
      }
      setState((prev) => {
        if (prev.settings.closedMonths.includes(cleanMonth)) {
          return prev;
        }
        return {
          ...prev,
          settings: {
            ...prev.settings,
            closedMonths: [...prev.settings.closedMonths, cleanMonth].sort(),
          },
        };
      });
    };

    const openMonth: FinanceContextValue["openMonth"] = (month) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          closedMonths: prev.settings.closedMonths.filter((item) => item !== month),
        },
      }));
    };

    const isMonthClosed: FinanceContextValue["isMonthClosed"] = (month) =>
      state.settings.closedMonths.includes(month);

    const replaceMovements: FinanceContextValue["replaceMovements"] = (nextMovements) => {
      const normalizedMovements = [...nextMovements].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      );
      setState((prev) => ({
        ...prev,
        movements: normalizedMovements,
      }));
    };

    const replaceFinanceData: FinanceContextValue["replaceFinanceData"] = (payload) => {
      setState((prev) => ({
        ...prev,
        movements: payload.movements
          ? [...payload.movements].sort(
              (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
            )
          : prev.movements,
        receivables: payload.receivables
          ? [...payload.receivables].sort(
              (a, b) =>
                a.status.localeCompare(b.status) ||
                a.commitmentDate.localeCompare(b.commitmentDate) ||
                b.createdAt.localeCompare(a.createdAt),
            )
          : prev.receivables,
        payables: payload.payables
          ? [...payload.payables].sort(
              (a, b) =>
                a.status.localeCompare(b.status) ||
                a.dueDate.localeCompare(b.dueDate) ||
                b.createdAt.localeCompare(a.createdAt),
            )
          : prev.payables,
      }));
    };

    const markBackupCompleted: FinanceContextValue["markBackupCompleted"] = () => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          lastBackupAt: new Date().toISOString(),
        },
      }));
    };

    const exportBackup: FinanceContextValue["exportBackup"] = () => JSON.stringify(state, null, 2);

    const importBackup: FinanceContextValue["importBackup"] = (raw) => {
      try {
        const parsed = parseFinanceState(raw);
        setState(parsed);
        return { ok: true };
      } catch {
        return { ok: false, error: "No se pudo leer el archivo de respaldo." };
      }
    };

    return {
      ...state,
      dashboard: summarizeDashboard(state),
      noticeMessage,
      notify,
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
      closeMonth,
      openMonth,
      isMonthClosed,
      replaceMovements,
      replaceFinanceData,
      markBackupCompleted,
      exportBackup,
      importBackup,
    };
  }, [noticeMessage, state]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used inside FinanceProvider");
  }
  return context;
}
