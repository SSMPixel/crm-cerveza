"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const secciones = [
  { href: "/", texto: "Inicio" },
  { href: "/mapa", texto: "Mapa" },
  { href: "/cuentas", texto: "Cuentas" },
  { href: "/visitas", texto: "Historial" },
];

// Barra fija abajo, al alcance del pulgar.
export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1100] border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {secciones.map((s) => {
          const activa =
            s.href === "/" ? ruta === "/" : ruta.startsWith(s.href);
          return (
            <li key={s.href} className="flex-1">
              <Link
                href={s.href}
                className={`block py-3 text-center text-sm font-medium ${
                  activa ? "text-amber-800" : "text-stone-500"
                }`}
              >
                {s.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
