"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

const links = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/ingresos", label: "Ingresos" },
  { href: "/egresos", label: "Egresos" },
  { href: "/cuentas-por-cobrar", label: "Por cobrar" },
  { href: "/cuentas-por-pagar", label: "Por pagar" },
  { href: "/reportes", label: "Reportes" },
  { href: "/configuracion", label: "Configuracion" },
  {
    href: process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || "https://finanzasdecorazon.vercel.app/",
    label: "Salir",
    isExit: true,
    external: true,
  },
];

export function FinanceShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 py-4 md:px-8 md:py-6">
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

      <nav className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-8">
        {links.map((link) => {
          const active = pathname === link.href;
          const className = `decorazon-card decorazon-button text-center px-4 py-3 font-extrabold ${
            active
              ? "!border-cyan-700 !bg-cyan-700 !text-white shadow-lg shadow-cyan-800/25"
              : link.isExit
                ? "!bg-white text-rose-700 hover:!border-rose-400 hover:!bg-rose-50"
                : "!bg-white text-[#113161] hover:!border-cyan-500 hover:!bg-cyan-50"
          }`;

          if (link.external) {
            return (
              <a key={link.href} href={link.href} className={className}>
                {link.label}
              </a>
            );
          }

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
