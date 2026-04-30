"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useFinance } from "@/components/finance/finance-provider";
import { Movement, Payable, Receivable } from "@/lib/finance/types";
import {
  calculatePayableStatus,
  calculateReceivableState,
  dateToMonthName,
  monthKey,
  parseMoneyInput,
  todayIso,
} from "@/lib/finance/utils";

const WEEK_IN_DAYS = 7;

function safeSheetName(input: string): string {
  return input.replace(/[\\/?*\[\]:]/g, "-").slice(0, 31);
}

function createMovementId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function ConfiguracionPage() {
  const {
    settings,
    movements,
    receivables,
    payables,
    addCategory,
    removeCategory,
    replaceFinanceData,
    markBackupCompleted,
  } = useFinance();
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const currentTime = new Date().getTime();

  const backupDue = useMemo(() => {
    if (!settings.lastBackupAt) {
      return true;
    }
    const last = new Date(settings.lastBackupAt).getTime();
    if (!Number.isFinite(last)) {
      return true;
    }
    const days = Math.floor((currentTime - last) / (1000 * 60 * 60 * 24));
    return days >= WEEK_IN_DAYS;
  }, [currentTime, settings.lastBackupAt]);

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

  const exportExcelBackup = () => {
    const workbook = XLSX.utils.book_new();
    const byType = {
      ingresos: movements.filter((item) => item.type === "ingreso"),
      egresos: movements.filter((item) => item.type === "gasto"),
    };

    for (const [label, items] of Object.entries(byType)) {
      const grouped = new Map<string, Movement[]>();
      for (const item of items) {
        const key = monthKey(item.date);
        const rows = grouped.get(key) ?? [];
        rows.push(item);
        grouped.set(key, rows);
      }

      const orderedMonths = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
      for (const month of orderedMonths) {
        const rows = (grouped.get(month) ?? []).map((item) => ({
          Fecha: item.date,
          Descripcion: item.description,
          Categoria: item.category,
          Contacto: item.clientOrProvider ?? "",
          MetodoPago: item.paymentMethod ?? "",
          Monto: item.amount,
          Notas: item.notes ?? "",
          CreadoEn: item.createdAt,
        }));

        const sheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(`${month}-${label}`));
      }
    }

    const receivablesRows = receivables.map((item) => ({
      Cliente: item.client,
      Proyecto: item.project,
      Total: item.totalAmount,
      Pagado: item.paidAmount,
      Saldo: item.balance,
      Vencimiento: item.commitmentDate,
      Estado: item.status,
      Notas: item.notes ?? "",
      CreadoEn: item.createdAt,
    }));
    if (receivablesRows.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(receivablesRows),
        safeSheetName("cuentas-por-cobrar"),
      );
    }

    const payablesRows = payables.map((item) => ({
      Proveedor: item.provider,
      Concepto: item.concept,
      Monto: item.amount,
      Vencimiento: item.dueDate,
      Estado: item.status,
      Notas: item.notes ?? "",
      CreadoEn: item.createdAt,
    }));
    if (payablesRows.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(payablesRows),
        safeSheetName("cuentas-por-pagar"),
      );
    }

    if (workbook.SheetNames.length === 0) {
      const sheet = XLSX.utils.json_to_sheet([
        { Mensaje: "Sin movimientos para exportar", Fecha: todayIso() },
      ]);
      XLSX.utils.book_append_sheet(workbook, sheet, "resumen");
    }

    XLSX.writeFile(workbook, `decorazon-respaldo-${todayIso()}.xlsx`);
    markBackupCompleted();
    setBackupMessage("Respaldo Excel guardado en este dispositivo.");
  };

  const importExcelBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const importedMovements: Movement[] = [];
      const importedReceivables: Receivable[] = [];
      const importedPayables: Payable[] = [];

      for (const sheetName of workbook.SheetNames) {
        const normalizedName = sheetName.toLowerCase();
        let type: Movement["type"] | null = null;
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (normalizedName.includes("ingreso") || normalizedName.includes("egreso")) {
          if (normalizedName.includes("ingreso")) type = "ingreso";
          if (normalizedName.includes("egreso")) type = "gasto";
          if (!type) continue;
          for (const row of rows) {
            const date = String(row.Fecha ?? row.fecha ?? "").trim();
            const description = String(row.Descripcion ?? row.descripcion ?? "").trim();
            const category = String(row.Categoria ?? row.categoria ?? "").trim();
            const amountRaw = String(row.Monto ?? row.monto ?? "").trim();
            const amount = parseMoneyInput(amountRaw);
            if (!date || !description || !category || amount <= 0) {
              continue;
            }

            importedMovements.push({
              id: createMovementId("mov"),
              type,
              date,
              month: dateToMonthName(date),
              description,
              category,
              amount,
              clientOrProvider: String(row.Contacto ?? row.contacto ?? "").trim(),
              paymentMethod: String(row.MetodoPago ?? row.metodopago ?? "").trim(),
              notes: String(row.Notas ?? row.notas ?? "").trim(),
              createdAt:
                String(row.CreadoEn ?? row.creadoen ?? "").trim() || new Date().toISOString(),
            });
          }
          continue;
        }

        if (normalizedName.includes("cobrar")) {
          for (const row of rows) {
            const client = String(row.Cliente ?? row.cliente ?? "").trim();
            const project = String(row.Proyecto ?? row.proyecto ?? "").trim();
            const commitmentDate = String(row.Vencimiento ?? row.vencimiento ?? "").trim();
            const totalAmount = parseMoneyInput(String(row.Total ?? row.total ?? ""));
            const paidAmount = Math.max(parseMoneyInput(String(row.Pagado ?? row.pagado ?? "")), 0);
            if (!client || !project || !commitmentDate || totalAmount <= 0) {
              continue;
            }
            const computed = calculateReceivableState(totalAmount, paidAmount, commitmentDate);
            importedReceivables.push({
              id: createMovementId("cxr"),
              client,
              project,
              totalAmount,
              paidAmount,
              balance: computed.balance,
              status: computed.status,
              commitmentDate,
              notes: String(row.Notas ?? row.notas ?? "").trim(),
              createdAt: String(row.CreadoEn ?? row.creadoen ?? "").trim() || new Date().toISOString(),
            });
          }
          continue;
        }

        if (normalizedName.includes("pagar")) {
          for (const row of rows) {
            const provider = String(row.Proveedor ?? row.proveedor ?? "").trim();
            const concept = String(row.Concepto ?? row.concepto ?? "").trim();
            const dueDate = String(row.Vencimiento ?? row.vencimiento ?? "").trim();
            const amount = parseMoneyInput(String(row.Monto ?? row.monto ?? ""));
            const rawStatus = String(row.Estado ?? row.estado ?? "pendiente").trim().toLowerCase();
            if (!provider || !concept || !dueDate || amount <= 0) {
              continue;
            }
            const status = calculatePayableStatus(
              dueDate,
              rawStatus === "pagado" ? "pagado" : "pendiente",
            );
            importedPayables.push({
              id: createMovementId("cxp"),
              provider,
              concept,
              amount,
              dueDate,
              status,
              notes: String(row.Notas ?? row.notas ?? "").trim(),
              createdAt: String(row.CreadoEn ?? row.creadoen ?? "").trim() || new Date().toISOString(),
            });
          }
        }
      }

      if (
        importedMovements.length === 0 &&
        importedReceivables.length === 0 &&
        importedPayables.length === 0
      ) {
        setBackupMessage("No se encontraron hojas validas en el archivo Excel.");
      } else {
        replaceFinanceData({
          movements: importedMovements,
          receivables: importedReceivables,
          payables: importedPayables,
        });
        setBackupMessage(
          `Respaldo importado: ${importedMovements.length} movimientos, ${importedReceivables.length} por cobrar y ${importedPayables.length} por pagar.`,
        );
      }
    } catch {
      setBackupMessage("No se pudo importar el archivo Excel.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="decorazon-card p-5">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Categorias de ingresos</h2>
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
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Categorias de gastos</h2>
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

      <section className="decorazon-card p-5 xl:col-span-2">
        <h2 className="text-2xl font-extrabold text-[#112f5b]">Respaldo Excel</h2>
        <p className="mt-2 text-sm text-slate-600">
          Exporta ingresos, egresos, por cobrar y por pagar. Ingresos y egresos van separados por
          mes, y luego puedes importar ese mismo archivo para recuperar todo.
        </p>
        {backupDue ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Recordatorio: hace mas de una semana que no guardas respaldo.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="decorazon-button bg-cyan-700 px-4 py-2 text-white"
            type="button"
            onClick={exportExcelBackup}
          >
            Guardar respaldo Excel
          </button>
          <label className="decorazon-button cursor-pointer border border-slate-300 bg-white px-4 py-2 text-[#1a3762]">
            Cargar respaldo Excel
            <input
              className="hidden"
              type="file"
              accept=".xlsx,.xls"
              onChange={importExcelBackup}
            />
          </label>
        </div>
        {backupMessage && <p className="mt-3 text-sm font-semibold text-cyan-700">{backupMessage}</p>}
      </section>
    </div>
  );
}
