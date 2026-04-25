"use client";

import { FormEvent, useMemo, useState } from "react";
import { useFinance } from "@/components/finance/finance-provider";
import { formatBs, todayIso } from "@/lib/finance/utils";
import { PayableStatus } from "@/lib/finance/types";

interface PayableForm {
  provider: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: PayableStatus;
  notes: string;
}

const emptyPayable = (): PayableForm => ({
  provider: "",
  concept: "",
  amount: 0,
  dueDate: todayIso(),
  status: "pendiente",
  notes: "",
});

export default function CuentasPorPagarPage() {
  const { payables, addPayable, updatePayable, markPayableAsPaid, deletePayable } = useFinance();
  const [form, setForm] = useState<PayableForm>(emptyPayable());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paidDates, setPaidDates] = useState<Record<string, string>>({});

  const ordered = useMemo(
    () =>
      [...payables].sort(
        (a, b) =>
          a.status.localeCompare(b.status) ||
          a.dueDate.localeCompare(b.dueDate) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    [payables],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.provider.trim() || !form.concept.trim() || form.amount <= 0) {
      return;
    }

    const payload = {
      provider: form.provider.trim(),
      concept: form.concept.trim(),
      amount: form.amount,
      dueDate: form.dueDate,
      status: form.status,
      notes: form.notes.trim(),
    };

    if (editingId) {
      updatePayable(editingId, payload);
    } else {
      addPayable(payload);
    }

    setEditingId(null);
    setForm(emptyPayable());
  };

  return (
    <div className="space-y-5">
      <section className="decorazon-card p-5">
        <h2 className="text-3xl font-extrabold text-[#112f5b]">Cuentas por pagar</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <label className="text-sm font-semibold text-slate-600">
            Proveedor
            <input
              className="decorazon-input mt-1"
              value={form.provider}
              onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Concepto
            <input
              className="decorazon-input mt-1"
              value={form.concept}
              onChange={(e) => setForm((prev) => ({ ...prev, concept: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Fecha de vencimiento
            <input
              className="decorazon-input mt-1"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Monto (Bs)
            <input
              className="decorazon-input mt-1"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Estado
            <select
              className="decorazon-input mt-1"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value as PayableStatus }))
              }
            >
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Notas
            <input
              className="decorazon-input mt-1"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
          <div className="md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              className="decorazon-button bg-gradient-to-r from-cyan-700 to-cyan-500 px-8 py-3 text-white"
            >
              {editingId ? "Actualizar" : "Guardar"}
            </button>
            {editingId && (
              <button
                type="button"
                className="decorazon-button ml-2 border border-slate-300 bg-white px-8 py-3 text-[#1a3762]"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyPayable());
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="decorazon-card p-5">
        <h3 className="text-2xl font-extrabold text-[#112f5b]">Pendientes y pagadas</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Proveedor</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 text-sm">
                  <td className="py-2">{item.provider}</td>
                  <td>{item.concept}</td>
                  <td className="font-bold">{formatBs(item.amount)}</td>
                  <td>{item.dueDate}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        item.status === "pagado"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "vencido"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate">{item.notes || "-"}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button
                      className="decorazon-button bg-cyan-700 px-3 py-1.5 text-white"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          provider: item.provider,
                          concept: item.concept,
                          amount: item.amount,
                          dueDate: item.dueDate,
                          status: item.status,
                          notes: item.notes ?? "",
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="decorazon-button bg-rose-500 px-3 py-1.5 text-white"
                      onClick={() => deletePayable(item.id)}
                    >
                      Eliminar
                    </button>
                    {item.status !== "pagado" && (
                      <>
                        <input
                          className="decorazon-input inline-block w-[150px]"
                          type="date"
                          value={paidDates[item.id] ?? todayIso()}
                          onChange={(event) =>
                            setPaidDates((prev) => ({ ...prev, [item.id]: event.target.value }))
                          }
                        />
                        <button
                          className="decorazon-button bg-emerald-600 px-3 py-1.5 text-white"
                          onClick={() => markPayableAsPaid(item.id, paidDates[item.id] ?? todayIso())}
                        >
                          Pagado
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {ordered.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={7}>
                    Sin cuentas por pagar registradas.
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
