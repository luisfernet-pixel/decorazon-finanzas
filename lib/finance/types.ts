export type MovementType = "ingreso" | "gasto";

export type ReceivableStatus = "pendiente" | "parcial" | "pagado" | "vencido";
export type PayableStatus = "pendiente" | "pagado" | "vencido";

export interface Movement {
  id: string;
  type: MovementType;
  date: string;
  month: string;
  description: string;
  category: string;
  amount: number;
  clientOrProvider?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface Receivable {
  id: string;
  client: string;
  project: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  commitmentDate: string;
  status: ReceivableStatus;
  notes?: string;
  createdAt: string;
}

export interface Payable {
  id: string;
  provider: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: PayableStatus;
  notes?: string;
  createdAt: string;
}

export interface FinanceSettings {
  expenseCategories: string[];
  incomeCategories: string[];
  closedMonths: string[];
  lastBackupAt: string | null;
}

export interface FinanceState {
  movements: Movement[];
  receivables: Receivable[];
  payables: Payable[];
  settings: FinanceSettings;
}
