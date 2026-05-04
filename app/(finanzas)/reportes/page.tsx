"use client";

import { useMemo } from "react";
import { useFinance } from "@/components/finance/finance-provider";
import { formatBs } from "@/lib/finance/utils";

const monthFormatter = new Intl.DateTimeFormat("es-BO", {
  month: "long",
  year: "numeric",
});

interface MonthlySummary {
  key: string;
  title: string;
  income: number;
  expense: number;
}

export default function ReportesPage() {
  const { dashboard, movements, receivables, payables } = useFinance();

  const incomeVsExpense = [
    { label: "Ingresos", value: dashboard.monthlyIncome, color: "from-emerald-500 to-emerald-400" },
    { label: "Gastos", value: dashboard.monthlyExpense, color: "from-rose-500 to-rose-400" },
  ];

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const movement of movements) {
      if (movement.type !== "gasto") {
        continue;
      }
      map.set(movement.category, (map.get(movement.category) ?? 0) + movement.amount);
    }
    return [...map.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [movements]);

  const monthlySummary = useMemo(() => {
    const map = new Map<string, MonthlySummary>();

    for (const movement of movements) {
      const date = new Date(`${movement.date}T00:00:00`);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          key,
          title: monthFormatter.format(date),
          income: movement.type === "ingreso" ? movement.amount : 0,
          expense: movement.type === "gasto" ? movement.amount : 0,
        });
        continue;
      }

      if (movement.type === "ingreso") {
        current.income += movement.amount;
      } else {
        current.expense += movement.amount;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [movements]);

  const receivablePending = receivables
    .filter((item) => item.status !== "pagado")
    .reduce((acc, item) => acc + item.balance, 0);

  const payablePending = payables
    .filter((item) => item.status !== "pagado")
    .reduce((acc, item) => acc + item.amount, 0);

  const totalIncome = movements
    .filter((item) => item.type === "ingreso")
    .reduce((acc, item) => acc + item.amount, 0);

  const totalExpense = movements
    .filter((item) => item.type === "gasto")
    .reduce((acc, item) => acc + item.amount, 0);

  const reportCards = [
    { label: "Saldo actual", value: formatBs(dashboard.currentBalance) },
    { label: "Ingresos acumulados", value: formatBs(totalIncome) },
    { label: "Gastos acumulados", value: formatBs(totalExpense) },
    { label: "Utilidad del mes", value: formatBs(dashboard.monthlyProfit) },
    { label: "Total por cobrar", value: formatBs(receivablePending) },
    { label: "Total por pagar", value: formatBs(payablePending) },
  ];

  const maxIncomeExpense = Math.max(...incomeVsExpense.map((item) => item.value), 1);
  const maxCategory = Math.max(...expenseByCategory.map((item) => item.amount), 1);
  const topCategories = expenseByCategory.slice(0, 4);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reportCards.map((card) => (
          <article key={card.label} className="decorazon-card p-4">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-[#123260]">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="decorazon-card p-5">
          <h2 className="text-2xl font-extrabold text-[#112f5b]">Ingresos vs gastos del mes</h2>
          <div className="mt-4 space-y-4">
            {incomeVsExpense.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm font-semibold text-slate-600">
                  <span>{item.label}</span>
                  <span>{formatBs(item.value)}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r ${item.color}`}
                    style={{ width: `${(item.value / maxIncomeExpense) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-2 text-sm font-bold text-slate-700">
              Utilidad mensual aproximada: {formatBs(dashboard.monthlyProfit)}
            </p>
          </div>
        </article>

        <article className="decorazon-card p-5">
          <h2 className="text-2xl font-extrabold text-[#112f5b]">Cuentas pendientes</h2>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
              <p className="text-sm text-slate-600">Cuentas por cobrar pendientes</p>
              <p className="text-2xl font-extrabold text-cyan-800">{formatBs(receivablePending)}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p className="text-sm text-slate-600">Cuentas por pagar pendientes</p>
              <p className="text-2xl font-extrabold text-rose-700">{formatBs(payablePending)}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="decorazon-card p-5">
          <h2 className="text-2xl font-extrabold text-[#112f5b]">Categorias donde mas se gasta</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {topCategories.map((item, index) => (
              <div
                key={item.category}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Top {index + 1}
                </p>
                <p className="mt-1 font-extrabold text-[#123260]">{item.category}</p>
                <p className="mt-1 text-lg font-extrabold text-rose-700">{formatBs(item.amount)}</p>
              </div>
            ))}
            {topCategories.length === 0 && (
              <p className="text-sm text-slate-500">Sin gastos suficientes para ranking todavia.</p>
            )}
          </div>
        </article>

        <article className="decorazon-card p-5">
          <h2 className="text-2xl font-extrabold text-[#112f5b]">Gastos por categoria</h2>
          <div className="mt-4 space-y-3">
            {expenseByCategory.map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex justify-between text-sm font-semibold text-slate-600">
                  <span>{item.category}</span>
                  <span>{formatBs(item.amount)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-sky-600 to-cyan-400"
                    style={{ width: `${(item.amount / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {expenseByCategory.length === 0 && (
              <p className="text-sm text-slate-500">Todavia no hay gastos registrados para reportar.</p>
            )}
          </div>
        </article>
      </section>

      <section className="decorazon-card p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Reporte mensual de entradas y salidas</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Mes</th>
                <th>Ingreso total</th>
                <th>Gasto total</th>
                <th>Utilidad</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.map((row) => {
                const profit = row.income - row.expense;
                return (
                  <tr key={row.key} className="border-t border-slate-200 text-sm">
                    <td className="py-2 capitalize">{row.title}</td>
                    <td className="font-bold text-emerald-700">{formatBs(row.income)}</td>
                    <td className="font-bold text-rose-700">{formatBs(row.expense)}</td>
                    <td className={profit >= 0 ? "font-bold text-cyan-700" : "font-bold text-rose-700"}>
                      {formatBs(profit)}
                    </td>
                  </tr>
                );
              })}
              {monthlySummary.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={4}>
                    Sin datos mensuales todavia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
