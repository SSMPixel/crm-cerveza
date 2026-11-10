"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Búsqueda por nombre o zona. Actualiza la lista mientras se escribe.
export function BuscadorCuentas() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(params.get("q") ?? "");

  useEffect(() => {
    const espera = setTimeout(() => {
      const actual = params.get("q") ?? "";
      if (texto.trim() === actual) return;
      const p = new URLSearchParams(params.toString());
      if (texto.trim()) p.set("q", texto.trim());
      else p.delete("q");
      router.replace(`${ruta}${p.size ? `?${p}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(espera);
  }, [texto, params, router, ruta]);

  return (
    <div className="relative mt-4">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-stone-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nombre o zona"
        aria-label="Buscar cuentas"
        className="block w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-base focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
      />
    </div>
  );
}
