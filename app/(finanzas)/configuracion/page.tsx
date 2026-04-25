"use client";

import { FormEvent, useState } from "react";
import { useFinance } from "@/components/finance/finance-provider";

export default function ConfiguracionPage() {
  const { settings, addCategory, removeCategory } = useFinance();
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");

  const addIncomeCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addCategory("income", income);
    setIncome("");
  };

  const addExpenseCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addCategory("expense", expense);
    setExpense("");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="decorazon-card p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Categorías de ingresos</h2>
        <form className="mt-3 flex gap-2" onSubmit={addIncomeCategory}>
          <input
            className="decorazon-input"
            value={income}
            onChange={(event) => setIncome(event.target.value)}
            placeholder="Ej: Mantenimiento"
          />
          <button className="decorazon-button bg-cyan-700 px-4 text-white" type="submit">
            Agregar
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.incomeCategories.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800"
            >
              {item}
              <button
                className="rounded-full bg-white px-2 text-xs text-rose-600"
                onClick={() => removeCategory("income", item)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="decorazon-card p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Categorías de gastos</h2>
        <form className="mt-3 flex gap-2" onSubmit={addExpenseCategory}>
          <input
            className="decorazon-input"
            value={expense}
            onChange={(event) => setExpense(event.target.value)}
            placeholder="Ej: Sueldos"
          />
          <button className="decorazon-button bg-cyan-700 px-4 text-white" type="submit">
            Agregar
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.expenseCategories.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700"
            >
              {item}
              <button
                className="rounded-full bg-white px-2 text-xs text-rose-600"
                onClick={() => removeCategory("expense", item)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

