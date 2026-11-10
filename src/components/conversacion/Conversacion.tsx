"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Comentario } from "@/lib/conversacion";
import {
  agregarComentario,
  marcarVistos,
} from "@/app/(app)/conversacion/acciones";

const fecha = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const rolCorto: Record<string, string> = {
  kam: "KAM",
  manager: "Manager",
  auditor: "Auditor",
};

export function Conversacion({
  cuentaId,
  comentarios,
  yo,
  puedeNotaInterna,
  puedeEscribir,
}: {
  cuentaId: string;
  comentarios: Comentario[];
  yo: string;
  puedeNotaInterna: boolean;
  puedeEscribir: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [interna, setInterna] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const ultimo = comentarios.at(-1)?.id;
  const marcado = useRef<string | undefined>(undefined);

  // Al ver la conversación, se marcan los mensajes como leídos.
  useEffect(() => {
    if (marcado.current === ultimo) return;
    marcado.current = ultimo;
    marcarVistos(cuentaId).catch(() => {});
  }, [cuentaId, ultimo]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setError(null);
    iniciar(async () => {
      try {
        const r = await agregarComentario(cuentaId, texto, interna);
        if ("error" in r) setError(r.error);
        else {
          setTexto("");
          setInterna(false);
          router.refresh();
        }
      } catch {
        setError("No se pudo enviar: revisa tu conexión.");
      }
    });
  }

  return (
    <div>
      {comentarios.length === 0 ? (
        <p className="text-sm text-stone-600">
          {puedeNotaInterna
            ? "Deja indicaciones al KAM sobre esta cuenta; él puede responder aquí."
            : "Aquí verás lo que tu manager te comente de esta cuenta, y le puedes responder."}
        </p>
      ) : (
        <ol className="space-y-2">
          {comentarios.map((c) => {
            const mio = c.autor_id === yo;
            return (
              <li
                key={c.id}
                className={`flex ${mio ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    c.interna
                      ? "border border-dashed border-stone-400 bg-stone-100"
                      : mio
                        ? "rounded-br-md bg-amber-800 text-white"
                        : "rounded-bl-md border border-stone-200 bg-white"
                  }`}
                >
                  <p
                    className={`text-xs ${mio && !c.interna ? "text-amber-100" : "text-stone-500"}`}
                  >
                    {mio ? "Tú" : `${c.autor} · ${rolCorto[c.rol] ?? c.rol}`} ·{" "}
                    {fecha.format(new Date(c.creado_en))}
                  </p>
                  {c.interna && (
                    <p className="text-xs font-medium text-stone-600">
                      Nota interna · el KAM no la ve
                    </p>
                  )}
                  <p className="mt-0.5 whitespace-pre-wrap break-words">
                    {c.texto}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {puedeEscribir && (
        <form onSubmit={enviar} className="mt-3">
          <div className="flex items-end gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={1}
              maxLength={2000}
              placeholder={
                interna ? "Nota solo para managers…" : "Escribe un mensaje…"
              }
              className="block max-h-40 min-h-11 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base focus:border-amber-700 focus:outline-none"
            />
            <button
              disabled={enviando || !texto.trim()}
              aria-label="Enviar"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-40"
            >
              {enviando ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
          {puedeNotaInterna && (
            <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={interna}
                onChange={(e) => setInterna(e.target.checked)}
                className="size-4 accent-amber-800"
              />
              Nota interna (el KAM no la ve)
            </label>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
