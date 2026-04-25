import excelSeed from "@/lib/finance/excel-seed.json";
import { FinanceSettings, FinanceState, Movement } from "@/lib/finance/types";

type SeedMovement = {
  date: string;
  month: string;
  description: string;
  amount: number;
  notes: string;
};

export const defaultSettings: FinanceSettings = {
  expenseCategories: [
    "Materiales",
    "Mano de obra",
    "Instalacion",
    "Transporte",
    "Servicios",
    "Comida",
    "Farmacia",
    "Herramientas",
    "Proveedores",
    "Otros",
  ],
  incomeCategories: [
    "Adelanto",
    "Pago final",
    "Diseno",
    "Fabricacion",
    "Instalacion",
    "Intereses",
    "Otros",
  ],
};

function expenseCategoryFromDescription(description: string): string {
  const text = description.toLowerCase();
  if (text.includes("comida")) return "Comida";
  if (text.includes("farmacia")) return "Farmacia";
  if (text.includes("instal")) return "Instalacion";
  if (text.includes("trans")) return "Transporte";
  if (text.includes("herramient")) return "Herramientas";
  if (text.includes("proveedor")) return "Proveedores";
  if (text.includes("mano de obra")) return "Mano de obra";
  if (text.includes("material")) return "Materiales";
  return "Otros";
}

function incomeCategoryFromDescription(description: string): string {
  const text = description.toLowerCase();
  if (text.includes("adelanto")) return "Adelanto";
  if (text.includes("interes")) return "Intereses";
  if (text.includes("pago final")) return "Pago final";
  if (text.includes("instal")) return "Instalacion";
  if (text.includes("fabric")) return "Fabricacion";
  if (text.includes("disen")) return "Diseno";
  return "Otros";
}

function buildSeedMovements(): Movement[] {
  const rows = excelSeed as { gastos: SeedMovement[]; ingresos: SeedMovement[] };
  const expenses: Movement[] = rows.gastos.map((item, index) => ({
    id: `mov-excel-g-${index + 1}`,
    type: "gasto",
    date: item.date,
    month: item.month || "",
    description: item.description,
    category: expenseCategoryFromDescription(item.description),
    amount: item.amount,
    notes: item.notes || "",
    createdAt: `${item.date}T08:00:00.000Z`,
  }));

  const incomes: Movement[] = rows.ingresos.map((item, index) => ({
    id: `mov-excel-i-${index + 1}`,
    type: "ingreso",
    date: item.date,
    month: item.month || "",
    description: item.description,
    category: incomeCategoryFromDescription(item.description),
    amount: item.amount,
    notes: item.notes || "",
    createdAt: `${item.date}T08:00:00.000Z`,
  }));

  return [...expenses, ...incomes].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export const seedMovements = buildSeedMovements();

export function isLegacyDemoState(state: FinanceState): boolean {
  if (state.movements.length > 3) {
    return false;
  }

  const ids = new Set(state.movements.map((item) => item.id));
  return ids.has("mov-seed-1") || ids.has("mov-seed-2");
}

export const initialFinanceState: FinanceState = {
  movements: seedMovements,
  receivables: [],
  payables: [],
  settings: defaultSettings,
};

