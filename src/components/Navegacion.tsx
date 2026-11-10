"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Íconos simples dibujados a mano (sin librerías), del mismo grosor.
const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const iconos = {
  inicio: (
    <svg viewBox="0 0 24 24" className="size-6" {...trazo} aria-hidden>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  ),
  mapa: (
    <svg viewBox="0 0 24 24" className="size-6" {...trazo} aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  ),
  cuentas: (
    <svg viewBox="0 0 24 24" className="size-6" {...trazo} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  ),
  historial: (
    <svg viewBox="0 0 24 24" className="size-6" {...trazo} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
};

const secciones = [
  { href: "/", texto: "Inicio", icono: iconos.inicio },
  { href: "/mapa", texto: "Mapa", icono: iconos.mapa },
  { href: "/cuentas", texto: "Cuentas", icono: iconos.cuentas },
  { href: "/visitas", texto: "Historial", icono: iconos.historial },
];

// Barra fija abajo, al alcance del pulgar.
export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1100] border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {secciones.map((s) => {
          const activa =
            s.href === "/" ? ruta === "/" : ruta.startsWith(s.href);
          return (
            <li key={s.href} className="flex-1">
              <Link
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-medium ${
                  activa ? "text-amber-800" : "text-stone-500"
                }`}
              >
                {s.icono}
                {s.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
