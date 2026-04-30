"use client";

import { FormEvent, useMemo, useState } from "react";
import { useFinance } from "@/components/finance/finance-provider";
import { formatBs, parseMoneyInput, todayIso } from "@/lib/finance/utils";

interface ReceivableForm {
  client: string;
  project: string;
  totalAmount: string;
  paidAmount: string;
  commitmentDate: string;
  notes: string;
}

const emptyReceivable = (): ReceivableForm => ({
  client: "",
  project: "",
  totalAmount: "",
  paidAmount: "",
  commitmentDate: todayIso(),
  notes: "",
});

export default function CuentasPorCobrarPage() {
  const { receivables, addReceivable, updateReceivable, markReceivableAsPaid, deleteReceivable } =
    useFinance();
  const [form, setForm] = useState<ReceivableForm>(emptyReceivable());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paidDates, setPaidDates] = useState<Record<string, string>>({});

  const ordered = useMemo(
    () =>
      [...receivables].sort(
        (a, b) =>
          a.status.localeCompare(b.status) ||
          a.commitmentDate.localeCompare(b.commitmentDate) ||
          b.createdAt.localeCompare(a.createdAt),
      ),
    [receivables],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const totalAmount = parseMoneyInput(form.totalAmount);
    const paidAmount = Math.max(parseMoneyInput(form.paidAmount), 0);
    if (!form.client.trim() || !form.project.trim() || totalAmount <= 0) {
      return;
    }

    const payload = {
      client: form.client.trim(),
      project: form.project.trim(),
      totalAmount,
      paidAmount,
      commitmentDate: form.commitmentDate,
      notes: form.notes.trim(),
    };

    if (editingId) {
      updateReceivable(editingId, payload);
    } else {
      addReceivable(payload);
    }

    setEditingId(null);
    setForm(emptyReceivable());
  };

  return (
    <div className="space-y-5">
      <section className="decorazon-card p-5">
        <h2 className="text-3xl font-extrabold text-[#112f5b]">Cuentas por cobrar</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <label className="text-sm font-semibold text-slate-600">
            Cliente
            <input
              className="decorazon-input mt-1"
              value={form.client}
              onChange={(e) => setForm((prev) => ({ ...prev, client: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Proyecto / Trabajo
            <input
              className="decorazon-input mt-1"
              value={form.project}
              onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Fecha de compromiso
            <input
              className="decorazon-input mt-1"
              type="date"
              value={form.commitmentDate}
              onChange={(e) => setForm((prev) => ({ ...prev, commitmentDate: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Monto total (Bs)
            <input
              className="decorazon-input mt-1"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 3500.75 o 3500,75"
              value={form.totalAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Monto pagado (Bs)
            <input
              className="decorazon-input mt-1"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 1200.50 o 1200,50"
              value={form.paidAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, paidAmount: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Saldo automático (Bs)
            <input
              className="decorazon-input mt-1 bg-slate-100"
              value={formatBs(
                Math.max(parseMoneyInput(form.totalAmount) - parseMoneyInput(form.paidAmount), 0),
              )}
              disabled
            />
          </label>
          <label className="text-sm font-semibold text-slate-600 md:col-span-2 xl:col-span-3">
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
                  setForm(emptyReceivable());
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="decorazon-card p-5">
        <h3 className="text-2xl font-extrabold text-[#112f5b]">Pendientes y cobradas</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Cliente</th>
                <th>Proyecto</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 text-sm">
                  <td className="py-2">{item.client}</td>
                  <td>{item.project}</td>
                  <td>{formatBs(item.totalAmount)}</td>
                  <td>{formatBs(item.paidAmount)}</td>
                  <td className="font-bold">{formatBs(item.balance)}</td>
                  <td>{item.commitmentDate}</td>
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
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="decorazon-button bg-cyan-700 px-3 py-1.5 text-white"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          client: item.client,
                          project: item.project,
                          totalAmount: String(item.totalAmount),
                          paidAmount: String(item.paidAmount),
                          commitmentDate: item.commitmentDate,
                          notes: item.notes ?? "",
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="decorazon-button bg-rose-500 px-3 py-1.5 text-white"
                      onClick={() => deleteReceivable(item.id)}
                    >
                      Eliminar
                    </button>
                    {item.status !== "pagado" && item.balance > 0 && (
                      <>
                        <input
                          className="h-9 w-[140px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
                          type="date"
                          value={paidDates[item.id] ?? todayIso()}
                          onChange={(event) =>
                            setPaidDates((prev) => ({ ...prev, [item.id]: event.target.value }))
                          }
                        />
                        <button
                          className="decorazon-button bg-emerald-600 px-3 py-1.5 text-white"
                          onClick={() => markReceivableAsPaid(item.id, paidDates[item.id] ?? todayIso())}
                        >
                          Pagado
                        </button>
                      </>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
              {ordered.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={8}>
                    Sin cuentas por cobrar registradas.
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
