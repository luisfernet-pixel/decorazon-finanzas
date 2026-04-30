import Image from "next/image";
import Link from "next/link";

const cotizadorUrl =
  process.env.NEXT_PUBLIC_COTIZADOR_URL?.trim() ?? "https://decorazon-cotizador-r3v3.vercel.app/";
const hasCotizadorUrl = cotizadorUrl.length > 0;

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#d8eef4_0%,_#edf2f6_52%,_#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute bottom-[-110px] right-[-90px] h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-8">
        <header className="decorazon-card flex flex-col items-center gap-3 px-4 py-6 text-center sm:gap-4 sm:px-8 sm:py-8">
          <Image
            src="/logo-decorazon.png"
            alt="Logo Decorazon"
            width={240}
            height={90}
            priority
            className="h-auto w-36 sm:w-[220px]"
          />
          <h1 className="text-2xl font-extrabold leading-tight text-[#0d2954] sm:text-4xl">
            Portal Decorazon
          </h1>
        </header>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          <Link
            href="/dashboard"
            className="decorazon-card group flex flex-col gap-3 px-5 py-6 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_14px_28px_rgba(13,41,84,0.11)] sm:px-7 sm:py-7"
          >
            <h2 className="text-xl font-extrabold text-[#0d2954] sm:text-2xl">Finanzas</h2>
            <p className="text-base text-[#355f8d]">
              Ingresa al panel financiero, movimientos, reportes y configuraci&oacute;n.
            </p>
            <span className="mt-2 inline-flex w-fit rounded-full bg-[#0f7087] px-4 py-1.5 text-sm font-bold text-white transition group-hover:bg-[#0d5f7a]">
              Finanzas
            </span>
          </Link>

          {hasCotizadorUrl ? (
            <a
              href={cotizadorUrl}
              className="decorazon-card group flex flex-col gap-3 px-5 py-6 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_14px_28px_rgba(13,41,84,0.11)] sm:px-7 sm:py-7"
            >
              <h2 className="text-xl font-extrabold text-[#0d2954] sm:text-2xl">Cotizar</h2>
              <p className="text-base text-[#355f8d]">
                Accede al sistema de cotizaciones y presupuestos para clientes.
              </p>
              <span className="mt-2 inline-flex w-fit rounded-full bg-[#0f7087] px-4 py-1.5 text-sm font-bold text-white transition group-hover:bg-[#0d5f7a]">
                Cotizacion
              </span>
            </a>
          ) : (
            <div className="decorazon-card flex flex-col gap-3 border-dashed border-cyan-300/80 px-5 py-6 sm:px-7 sm:py-7">
              <h2 className="text-xl font-extrabold text-[#0d2954] sm:text-2xl">Cotizar</h2>
              <p className="text-base text-[#355f8d]">
                Configura <code>NEXT_PUBLIC_COTIZADOR_URL</code> para enlazar esta opci&oacute;n.
              </p>
              <span className="mt-2 inline-flex w-fit cursor-not-allowed rounded-full bg-[#97b5c3] px-4 py-1.5 text-sm font-bold text-white">
                URL pendiente
              </span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
