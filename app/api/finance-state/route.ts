import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { initialFinanceState } from "@/lib/finance/defaults";
import { FinanceState } from "@/lib/finance/types";
import { normalizeFinanceState } from "@/lib/finance/state";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "finance-state.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(initialFinanceState, null, 2), "utf8");
  }
}

async function loadState(): Promise<FinanceState> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return normalizeFinanceState(JSON.parse(raw) as Partial<FinanceState>);
}

async function saveState(state: FinanceState): Promise<FinanceState> {
  const normalized = normalizeFinanceState(state);
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json({ state }, { headers: noStoreHeaders() });
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el estado compartido." },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<FinanceState> | { state?: Partial<FinanceState> };
    const incoming: Partial<FinanceState> | undefined =
      "state" in body ? body.state : (body as Partial<FinanceState>);
    const state = await saveState(normalizeFinanceState(incoming));
    return NextResponse.json({ state }, { headers: noStoreHeaders() });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar el estado compartido." },
      { status: 400, headers: noStoreHeaders() },
    );
  }
}
