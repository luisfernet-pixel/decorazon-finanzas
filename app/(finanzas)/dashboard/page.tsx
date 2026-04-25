"use client";

import { useMemo } from "react";
import { useFinance } from "@/components/finance/finance-provider";
import { daysUntil, formatBs } from "@/lib/finance/utils";

export default function DashboardPage() {
  const { dashboard, movements, payables } = useFinance();

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const movement of movements) {
      if (movement.type !== "gasto") {
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

  const cards = [
    { label: "Saldo actual", value: formatBs(dashboard.currentBalance) },
    { label: "Ingresos del mes", value: formatBs(dashboard.monthlyIncome) },
    { label: "Gastos del mes", value: formatBs(dashboard.monthlyExpense) },
    { label: "Utilidad del mes", value: formatBs(dashboard.monthlyProfit) },
    { label: "Total por cobrar", value: formatBs(dashboard.receivables) },
    { label: "Total por pagar", value: formatBs(dashboard.payables) },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="decorazon-card p-4">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-[#123260]">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="decorazon-card p-5">
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

        <article className="decorazon-card p-5">
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

      <section className="decorazon-card p-5">
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
