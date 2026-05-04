"use client";

import { useEffect, useMemo, useState } from "react";
import { useFinance } from "@/components/finance/finance-provider";
import { currentMonthKey, daysUntil, formatBs, monthKey, parseMoneyInput } from "@/lib/finance/utils";

const REVIEWED_HINTS_KEY = "decorazon-finanzas-reviewed-hints-v1";

export default function DashboardPage() {
  const { dashboard, movements, payables } = useFinance();
  const [bankBalanceInput, setBankBalanceInput] = useState("");
  const [reviewedHintIds, setReviewedHintIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(REVIEWED_HINTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const monthLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-BO", {
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    const currentMonth = currentMonthKey();
    for (const movement of movements) {
      if (movement.type !== "gasto") {
        continue;
      }
      const normalizedCategory = movement.category.trim().toLowerCase();
      const movementMonth = monthKey(movement.date);
      const isHistoricalOther = normalizedCategory === "otros" && movementMonth < currentMonth;
      if (isHistoricalOther) {
        continue;
      }
      map.set(movement.category, (map.get(movement.category) ?? 0) + movement.amount);
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [movements]);

  const latestMovements = useMemo(
    () =>
      [...movements]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [movements],
  );

  const alerts = useMemo(
    () =>
      payables
        .filter((item) => item.status !== "pagado")
        .map((item) => ({ ...item, days: daysUntil(item.dueDate) }))
        .filter((item) => item.days <= 7)
        .sort((a, b) => a.days - b.days),
    [payables],
  );

  const monthlyClosings = useMemo(() => {
    const monthlyMap = new Map<string, { income: number; expense: number }>();

    for (const movement of movements) {
      const date = new Date(`${movement.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const row = monthlyMap.get(key) ?? { income: 0, expense: 0 };
      if (movement.type === "ingreso") {
        row.income += movement.amount;
      } else {
        row.expense += movement.amount;
      }
      monthlyMap.set(key, row);
    }

    const sortedEntries = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const chronological = sortedEntries.reduce<
      Array<{
        key: string;
        label: string;
        income: number;
        expense: number;
        net: number;
        openingBalance: number;
        closingBalance: number;
      }>
    >((acc, [key, row]) => {
        const [yearStr, monthStr] = key.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        const label = monthLabelFormatter.format(new Date(year, month - 1, 1));
        const net = row.income - row.expense;
        const openingBalance = acc.length ? acc[acc.length - 1].closingBalance : 0;
        const closingBalance = openingBalance + net;
        return [
          ...acc,
          {
          key,
          label,
          income: row.income,
          expense: row.expense,
          net,
          openingBalance,
          closingBalance,
          },
        ];
      }, []);

    return chronological.reverse();
  }, [monthLabelFormatter, movements]);

  const cards = [
    { label: "Saldo actual", value: formatBs(dashboard.currentBalance) },
    { label: "Ingresos del mes", value: formatBs(dashboard.monthlyIncome) },
    { label: "Gastos del mes", value: formatBs(dashboard.monthlyExpense) },
    { label: "Utilidad del mes", value: formatBs(dashboard.monthlyProfit) },
    { label: "Total por cobrar", value: formatBs(dashboard.receivables) },
    { label: "Total por pagar", value: formatBs(dashboard.payables) },
  ];
  const bankBalance = parseMoneyInput(bankBalanceInput);
  const hasBankBalance = bankBalanceInput.trim().length > 0;
  const difference = hasBankBalance ? dashboard.currentBalance - bankBalance : 0;
  const absDifference = Math.abs(difference);

  const reconciliationHints = useMemo(() => {
    if (!hasBankBalance || absDifference <= 0) return [];

    const sorted = [...movements].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );

    const exactMatches = sorted.filter((m) => Math.abs(m.amount - absDifference) < 0.01);
    if (exactMatches.length > 0) {
      return exactMatches.slice(0, 8);
    }

    const threshold = Math.max(1, absDifference * 0.15);
    return sorted
      .filter((m) => Math.abs(m.amount - absDifference) <= threshold)
      .slice(0, 8);
  }, [absDifference, hasBankBalance, movements]);
  const visibleReconciliationHints = useMemo(
    () => reconciliationHints.filter((item) => !reviewedHintIds.includes(item.id)),
    [reconciliationHints, reviewedHintIds],
  );

  useEffect(() => {
    window.localStorage.setItem(REVIEWED_HINTS_KEY, JSON.stringify(reviewedHintIds));
  }, [reviewedHintIds]);

  const toggleReviewedHint = (id: string) => {
    setReviewedHintIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  const clearReviewedHints = () => {
    setReviewedHintIds([]);
  };

  return (
    <div className="dashboard-cotizador-theme space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="decorazon-card dashboard-kpi-card p-4">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-[#123260]">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="decorazon-card dashboard-panel p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Conciliacion de saldo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Escribe el saldo real de tu banco y compara con el saldo de la app.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-600">
            Saldo real en banco (Bs)
            <input
              className="decorazon-input mt-1"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 19136.81 o 19.136,81"
              value={bankBalanceInput}
              onChange={(event) => setBankBalanceInput(event.target.value)}
            />
          </label>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Saldo app</p>
            <p className="mt-1 text-xl font-extrabold text-[#123260]">{formatBs(dashboard.currentBalance)}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Diferencia (app - banco)</p>
            <p
              className={`mt-1 text-xl font-extrabold ${
                hasBankBalance ? (difference >= 0 ? "text-cyan-100" : "text-rose-300") : "text-[#ee2463]"
              }`}
            >
              {hasBankBalance ? formatBs(difference) : "Ingresa tu saldo real"}
            </p>
          </article>
        </div>

        {hasBankBalance && absDifference > 0 ? (
          <div className="mt-4">
            <h3 className="text-lg font-extrabold text-[#123260]">
              Movimientos que pueden explicar {formatBs(absDifference)}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Sugerencia: revisa primero si estos movimientos estan duplicados o mal registrados.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                Pendientes: {visibleReconciliationHints.length}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                Revisados: {Math.max(reconciliationHints.length - visibleReconciliationHints.length, 0)}
              </span>
              {reviewedHintIds.length > 0 && (
                <button
                  type="button"
                  className="decorazon-button border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#1a3762]"
                  onClick={clearReviewedHints}
                >
                  Limpiar revisados
                </button>
              )}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Fecha</th>
                    <th>Tipo</th>
                    <th>Descripcion</th>
                    <th>Categoria</th>
                    <th>Monto</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReconciliationHints.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200 text-sm">
                      <td className="py-2">{item.date}</td>
                      <td className={item.type === "ingreso" ? "text-emerald-700" : "text-rose-600"}>
                        {item.type}
                      </td>
                      <td>{item.description}</td>
                      <td>{item.category}</td>
                      <td className="font-bold">{formatBs(item.amount)}</td>
                      <td>
                        <button
                          type="button"
                          className="decorazon-button border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"
                          onClick={() => toggleReviewedHint(item.id)}
                        >
                          Marcar revisado
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleReconciliationHints.length === 0 && (
                    <tr>
                      <td className="py-3 text-slate-500" colSpan={6}>
                        {reconciliationHints.length === 0
                          ? "No hay coincidencias cercanas. Revisa varios movimientos pequeños del mismo periodo."
                          : "Ya revisaste todas las sugerencias actuales."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="decorazon-card dashboard-panel p-5">
          <h2 className="text-2xl font-extrabold text-[#112f5b]">Últimos movimientos</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {latestMovements.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 text-sm">
                    <td className="py-2">{item.date}</td>
                    <td className={item.type === "ingreso" ? "text-emerald-700" : "text-rose-600"}>
                      {item.type}
                    </td>
                    <td>{item.description}</td>
                    <td className="font-bold">{formatBs(item.amount)}</td>
                  </tr>
                ))}
                {latestMovements.length === 0 && (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={4}>
                      Aún no hay movimientos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="decorazon-card dashboard-panel p-5">
          <h2 className="text-2xl font-extrabold text-[#112f5b]">Gastos por categoría</h2>
          <div className="mt-4 space-y-3">
            {expensesByCategory.map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex items-center justify-between text-sm font-semibold text-slate-600">
                  <span>{item.category}</span>
                  <span>{formatBs(item.amount)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-sky-400"
                    style={{ width: `${Math.min(100, (item.amount / (expensesByCategory[0]?.amount || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {expensesByCategory.length === 0 && (
              <p className="text-sm text-slate-500">Sin datos de gastos todavía.</p>
            )}
          </div>
        </article>
      </section>

      <section className="decorazon-card dashboard-panel p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Cierre de cuenta por mes</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Mes</th>
                <th>Saldo apertura</th>
                <th>Ingresos</th>
                <th>Gastos</th>
                <th>Neto del mes</th>
                <th>Saldo al cierre</th>
              </tr>
            </thead>
            <tbody>
              {monthlyClosings.map((row) => (
                <tr key={row.key} className="border-t border-slate-200 text-sm">
                  <td className="py-2 capitalize">{row.label}</td>
                  <td className="font-semibold text-slate-700">{formatBs(row.openingBalance)}</td>
                  <td className="text-emerald-700">{formatBs(row.income)}</td>
                  <td className="text-rose-600">{formatBs(row.expense)}</td>
                  <td className={row.net >= 0 ? "text-emerald-700 font-semibold" : "text-rose-600 font-semibold"}>
                    {formatBs(row.net)}
                  </td>
                  <td className="font-bold text-[#123260]">{formatBs(row.closingBalance)}</td>
                </tr>
              ))}
              {monthlyClosings.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={6}>
                    Aun no hay datos para calcular cierres mensuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="decorazon-card dashboard-panel p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Alertas de cuentas por pagar</h2>
        <div className="mt-3 space-y-2">
          {alerts.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                item.days < 0
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <strong>{item.provider}</strong> · {item.concept} · {formatBs(item.amount)} ·
              {item.days < 0 ? ` vencida hace ${Math.abs(item.days)} días` : ` vence en ${item.days} días`}
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-sm text-emerald-700">No hay cuentas por pagar próximas o vencidas.</p>
          )}
        </div>
      </section>
    </div>
  );
}
