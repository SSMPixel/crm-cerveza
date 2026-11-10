"use client";

// Descarga un archivo mostrando qué está pasando: "Preparando…" mientras el
// servidor lo arma, "✓ Descargado" al terminar, o un aviso si algo falla.
import { useState } from "react";

type Estado = "listo" | "preparando" | "hecho" | "error";

export function BotonDescargar({
  href,
  texto = "Descargar",
  className = "",
}: {
  href: string;
  texto?: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<Estado>("listo");

  async function descargar() {
    if (estado === "preparando") return;
    setEstado("preparando");
    try {
      const r = await fetch(href, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const nombre =
        r.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "archivo.xlsx";
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setEstado("hecho");
    } catch {
      setEstado("error");
    }
    setTimeout(() => setEstado("listo"), 2500);
  }

  const etiqueta = {
    listo: texto,
    preparando: "Preparando…",
    hecho: "✓ Descargado",
    error: "No se pudo",
  }[estado];

  return (
    <button
      type="button"
      onClick={descargar}
      aria-busy={estado === "preparando"}
      aria-live="polite"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.97] ${
        estado === "hecho"
          ? "border-green-600 bg-green-50 text-green-800"
          : estado === "error"
            ? "border-red-300 bg-red-50 text-red-800"
            : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50 active:bg-stone-200"
      } ${className}`}
    >
      {estado === "preparando" ? (
        <svg
          viewBox="0 0 24 24"
          className="size-4 animate-spin"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeOpacity=".25"
            strokeWidth="3"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : estado === "listo" ? (
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path
            d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      {etiqueta}
    </button>
  );
}
