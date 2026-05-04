"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { useFinance } from "@/components/finance/finance-provider";

const links = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/ingresos", label: "Ingresos" },
  { href: "/egresos", label: "Egresos" },
  { href: "/cuentas-por-cobrar", label: "Por cobrar" },
  { href: "/cuentas-por-pagar", label: "Por pagar" },
  { href: "/reportes", label: "Reportes" },
  { href: "/configuracion", label: "Configuracion" },
  { href: "/", label: "Salir", isExit: true },
];

export function FinanceShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { noticeMessage } = useFinance();

  return (
    <div className="finance-theme min-h-screen px-4 py-4 md:px-8 md:py-6">
      {noticeMessage ? (
        <div className="fixed right-5 top-5 z-[9999] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {noticeMessage}
        </div>
      ) : null}
      <header
        className="rounded-[2rem] px-5 py-7 text-white shadow-xl shadow-cyan-900/20 md:px-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--brand-strong) 0%, var(--brand-start) 40%, var(--brand-end) 100%)",
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/90 p-2 shadow-md">
            <Image
              src="/logo-decorazon.png"
              alt="Logo Decorazon"
              width={84}
              height={84}
              className="h-auto w-auto max-h-full max-w-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-50/90">
              Decorazon · App Financiera
            </p>
            <h1 className="mt-2 text-4xl font-extrabold">Decorazon Finanzas</h1>
            <p className="mt-2 text-lg text-cyan-50">
              Registro rapido de ingresos, egresos y cuentas internas.
            </p>
            <p className="mt-1 text-cyan-100">Av. Garcia Lanza No. 700 · 70695395 / 65170766</p>
          </div>
        </div>
      </header>

      <nav className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-8">
        {links.map((link) => {
          const active = pathname === link.href;
          const className = `decorazon-card decorazon-button flex min-h-[52px] items-center justify-center px-4 py-3 text-center text-sm font-extrabold leading-tight sm:text-base ${
            active
              ? "!border-cyan-700 !bg-cyan-700 !text-white shadow-lg shadow-cyan-800/25"
              : link.isExit
                ? "!bg-white text-rose-700 hover:!border-rose-400 hover:!bg-rose-50"
                : "!bg-white text-[#113161] hover:!border-cyan-500 hover:!bg-cyan-50"
          }`;

          return (
            <Link key={link.href} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <main className="mt-5 pb-8">{children}</main>
    </div>
  );
}
