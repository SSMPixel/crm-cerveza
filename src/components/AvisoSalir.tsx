"use client";

// Si hay datos sin guardar, pregunta antes de salir de la pantalla:
// al tocar un enlace de la app y al cerrar o recargar la pestaña.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AvisoSalir({
  activo,
  mensaje = "Perderás lo que capturaste.",
}: {
  activo: boolean;
  mensaje?: string;
}) {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    const antesDeCerrar = (e: BeforeUnloadEvent) => e.preventDefault();
    // Fase de captura: corre antes que los <Link> de Next.
    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return; // WhatsApp, llamadas, mapas
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      e.preventDefault();
      e.stopPropagation();
      setDestino(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", antesDeCerrar);
    document.addEventListener("click", alTocar, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeCerrar);
      document.removeEventListener("click", alTocar, true);
    };
  }, [activo]);

  if (!destino) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-salir"
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={() => setDestino(null)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="aviso-salir" className="text-lg font-semibold">
          ¿Salir sin guardar?
        </h2>
        <p className="mt-1 text-stone-600">{mensaje}</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => setDestino(null)}
            className="rounded-lg bg-amber-800 px-4 py-3 font-medium text-white hover:bg-amber-900"
          >
            Seguir capturando
          </button>
          <button
            type="button"
            onClick={() => {
              const ir = destino;
              setDestino(null);
              router.push(ir);
            }}
            className="rounded-lg border border-stone-300 bg-white px-4 py-3 font-medium text-red-700"
          >
            Salir y descartar
          </button>
        </div>
      </div>
    </div>
  );
}
