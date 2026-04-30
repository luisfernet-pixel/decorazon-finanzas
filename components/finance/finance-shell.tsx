"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useState } from "react";

const links = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/ingresos", label: "Ingresos" },
  { href: "/egresos", label: "Egresos" },
  { href: "/cuentas-por-cobrar", label: "Por cobrar" },
  { href: "/cuentas-por-pagar", label: "Por pagar" },
  { href: "/reportes", label: "Reportes" },
  { href: "/configuracion", label: "Configuracion" },
  { href: "#", label: "Salir", isExit: true },
];

export function FinanceShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [showPortalSwitch, setShowPortalSwitch] = useState(false);

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

          if (link.isExit) {
            return (
              <button
                key={link.label}
                type="button"
                className={className}
                onClick={() => setShowPortalSwitch((current) => !current)}
              >
                {link.label}
              </button>
            );
          }

          return (
            <Link key={link.href} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {showPortalSwitch ? (
        <section className="decorazon-card mt-4 p-4">
          <p className="text-sm font-bold text-[#113161]">Ir a:</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a
              href="https://finanzasdecorazon.vercel.app/"
              className="decorazon-button rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-center font-extrabold text-[#113161] hover:bg-cyan-100"
            >
              Portal Finanzas
            </a>
            <a
              href="https://decorazon-cotizador-r3v3.vercel.app/"
              className="decorazon-button rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-center font-extrabold text-[#113161] hover:bg-cyan-100"
            >
              Portal Cotizador
            </a>
          </div>
        </section>
      ) : null}

      <main className="mt-5 pb-8">{children}</main>
    </div>
  );
}
