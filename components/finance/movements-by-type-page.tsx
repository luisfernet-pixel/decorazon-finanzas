"use client";

import { FormEvent, useMemo, useState } from "react";
import { useFinance } from "@/components/finance/finance-provider";
import { Movement, MovementType } from "@/lib/finance/types";
import { formatBs, monthKey, parseMoneyInput, todayIso } from "@/lib/finance/utils";
import { defaultSettings } from "@/lib/finance/defaults";

interface MonthlyGroup {
  key: string;
  title: string;
  total: number;
  items: Movement[];
}

const monthFormatter = new Intl.DateTimeFormat("es-BO", {
  month: "long",
  year: "numeric",
});

function buildMonthlyGroups(movements: Movement[]): MonthlyGroup[] {
  const map = new Map<string, MonthlyGroup>();

  for (const movement of movements) {
    const date = new Date(`${movement.date}T00:00:00`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const row = map.get(key);
    if (row) {
      row.total += movement.amount;
      row.items.push(movement);
    } else {
      map.set(key, {
        key,
        title: monthFormatter.format(date),
        total: movement.amount,
        items: [movement],
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((group) => ({
      ...group,
      items: [...group.items].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      ),
    }));
}

interface MovementForm {
  date: string;
  description: string;
  category: string;
  amount: string;
  contact: string;
  paymentMethod: string;
  notes: string;
}

const paymentMethodOptions = ["QR", "Transferencia", "Efectivo", "Otro"] as const;

export function MovementsByTypePage({ type }: { type: MovementType }) {
  const {
    movements,
    settings,
    addMovement,
    updateMovement,
    deleteMovement,
    closeMonth,
    openMonth,
    isMonthClosed,
  } = useFinance();
  const isIncome = type === "ingreso";
  const categories = useMemo(() => {
    const fromState = isIncome ? settings.incomeCategories : settings.expenseCategories;
    const fallback = isIncome
      ? defaultSettings.incomeCategories
      : defaultSettings.expenseCategories;
    return Array.from(new Set([...fromState, ...fallback]));
  }, [isIncome, settings.expenseCategories, settings.incomeCategories]);
  const [form, setForm] = useState<MovementForm>({
    date: todayIso(),
    description: "",
    category: categories[0] ?? "Otros",
    amount: "",
    contact: "",
    paymentMethod: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const formMonthClosed = isMonthClosed(monthKey(form.date));
  const normalizedPaymentMethod =
    form.paymentMethod && !paymentMethodOptions.includes(form.paymentMethod as (typeof paymentMethodOptions)[number])
      ? "Otro"
      : form.paymentMethod;

  const typedMovements = useMemo(
    () => movements.filter((item) => item.type === type),
    [movements, type],
  );
  const grouped = useMemo(() => buildMonthlyGroups(typedMovements), [typedMovements]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = parseMoneyInput(form.amount);
    if (!form.description.trim() || !form.category.trim() || amount <= 0) {
      return;
    }

    const payload = {
      type,
      date: form.date,
      description: form.description.trim(),
      category: form.category.trim(),
      amount,
      clientOrProvider: form.contact.trim(),
      paymentMethod: form.paymentMethod.trim(),
      notes: form.notes.trim(),
    };

    if (editingId) {
      updateMovement(editingId, payload);
    } else {
      addMovement(payload);
    }

    setEditingId(null);
    setForm({
      date: todayIso(),
      description: "",
      category: categories[0] ?? "Otros",
      amount: "",
      contact: "",
      paymentMethod: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-5">
      <section className="decorazon-card p-5">
        <h2 className="text-3xl font-extrabold text-[#112f5b]">
          {isIncome ? "Ingresos" : "Egresos"}
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
          <label className="text-sm font-semibold text-slate-600">
            Fecha
            <input
              className="decorazon-input mt-1"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600 md:col-span-2">
            Descripcion
            <input
              className="decorazon-input mt-1"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Monto (Bs)
            <input
              className="decorazon-input mt-1"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 1500.50 o 1500,50"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Categoria
            <select
              className="decorazon-input mt-1"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              required
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              {categories.length === 0 && <option value="Otros">Otros</option>}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-600">
            {isIncome ? "Cliente (opcional)" : "Proveedor (opcional)"}
            <input
              className="decorazon-input mt-1"
              value={form.contact}
              onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Metodo de pago (opcional)
            <select
              className="decorazon-input mt-1"
              value={normalizedPaymentMethod}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
            >
              <option value="">Opcional</option>
              {paymentMethodOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-600 md:col-span-2 xl:col-span-4">
            Notas
            <input
              className="decorazon-input mt-1"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            {formMonthClosed && (
              <p className="mb-2 text-sm font-semibold text-amber-700">
                El mes de la fecha seleccionada esta bloqueado.
              </p>
            )}
            <button
              type="submit"
              disabled={formMonthClosed}
              className="decorazon-button bg-gradient-to-r from-cyan-700 to-cyan-500 px-8 py-3 text-white shadow-md shadow-cyan-700/25"
            >
              {editingId
                ? `Actualizar ${isIncome ? "ingreso" : "egreso"}`
                : `Guardar ${isIncome ? "ingreso" : "egreso"}`}
            </button>
            {editingId && (
              <button
                type="button"
                className="decorazon-button ml-2 border border-slate-300 bg-white px-8 py-3 text-[#1a3762]"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    date: todayIso(),
                    description: "",
                    category: categories[0] ?? "Otros",
                    amount: "",
                    contact: "",
                    paymentMethod: "",
                    notes: "",
                  });
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="decorazon-card p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">
          Tabla mensual de {isIncome ? "ingresos" : "egresos"}
        </h2>
        <div className="mt-3 space-y-3">
          {grouped.map((group, index) => (
            <details
              key={group.key}
              className="rounded-xl border border-slate-200 bg-white"
              open={index === 0}
            >
              <summary className="cursor-pointer list-none px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-[#123260] capitalize">{group.title}</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className={`decorazon-button px-3 py-1.5 text-xs font-bold ${
                        isMonthClosed(group.key)
                          ? "border border-amber-300 bg-amber-50 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                      onClick={() =>
                        isMonthClosed(group.key) ? openMonth(group.key) : closeMonth(group.key)
                      }
                    >
                      {isMonthClosed(group.key) ? "Desbloquear mes" : "Bloquear mes"}
                    </button>
                    <p className={`font-bold ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>
                      Total: {formatBs(group.total)}
                    </p>
                  </div>
                </div>
              </summary>
              <div className="overflow-x-auto border-t border-slate-200 px-3 py-2">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Fecha</th>
                      <th>Descripcion</th>
                      <th>Categoria</th>
                      <th>{isIncome ? "Cliente" : "Proveedor"}</th>
                      <th>Metodo</th>
                      <th>Monto</th>
                      <th>Notas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200 text-sm">
                        <td className="py-2">{item.date}</td>
                        <td>{item.description}</td>
                        <td>{item.category}</td>
                        <td>{item.clientOrProvider || "-"}</td>
                        <td>{item.paymentMethod || "-"}</td>
                        <td className="font-bold">{formatBs(item.amount)}</td>
                        <td className="max-w-[220px] truncate">{item.notes || "-"}</td>
                        <td className="space-x-2 whitespace-nowrap">
                          {(() => {
                            const blocked = isMonthClosed(group.key);
                            return (
                              <>
                          <button
                            className={`decorazon-button px-3 py-1.5 text-white ${
                              blocked
                                ? "cursor-not-allowed bg-slate-400 opacity-70"
                                : "bg-cyan-700"
                            }`}
                            onClick={() => {
                              if (blocked) {
                                window.alert(
                                  "Este mes esta bloqueado. Desbloquealo en el encabezado del mes para editar.",
                                );
                                return;
                              }
                              setEditingId(item.id);
                              setForm({
                                date: item.date,
                                description: item.description,
                                category: item.category,
                                amount: String(item.amount),
                                contact: item.clientOrProvider ?? "",
                                paymentMethod: item.paymentMethod ?? "",
                                notes: item.notes ?? "",
                              });
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className={`decorazon-button px-3 py-1.5 text-white ${
                              blocked
                                ? "cursor-not-allowed bg-slate-400 opacity-70"
                                : "bg-rose-500"
                            }`}
                            onClick={() => {
                              if (blocked) {
                                window.alert(
                                  "Este mes esta bloqueado. Desbloquealo en el encabezado del mes para eliminar.",
                                );
                                return;
                              }
                              deleteMovement(item.id);
                            }}
                          >
                            Eliminar
                          </button>
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
          {grouped.length === 0 && (
            <p className="text-sm text-slate-500">
              Sin {isIncome ? "ingresos" : "egresos"} registrados.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
