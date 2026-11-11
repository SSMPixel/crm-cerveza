"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcadoresPendientes } from "@/lib/identidad";
import { TextoAviso } from "@/components/privacidad/TextoAviso";
import { publicarAviso } from "@/app/(app)/aviso/acciones";

export function EditorAviso({
  inicial,
  plantilla,
  hayAviso,
}: {
  inicial: string;
  plantilla: string;
  hayAviso: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial);
  const [vista, setVista] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicando, iniciar] = useTransition();
  const pendientes = marcadoresPendientes(texto);
  const sinCambios = hayAviso && texto.trim() === inicial.trim();

  function publicar() {
    setError(null);
    iniciar(async () => {
      try {
        const r = await publicarAviso(texto);
        if ("error" in r) setError(r.error);
        else router.push("/aviso");
      } catch {
        setError("No se pudo publicar: revisa tu conexión.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => setVista(v)}
            aria-pressed={vista === v}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              vista === v
                ? "border-amber-800 bg-amber-800 text-white"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {v ? "Vista previa" : "Editar"}
          </button>
        ))}
        {hayAviso && (
          <button
            type="button"
            onClick={() => setTexto(plantilla)}
            className="ml-auto text-sm text-stone-600 underline underline-offset-4"
          >
            Volver a la plantilla
          </button>
        )}
      </div>

      {vista ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <TextoAviso texto={texto} />
        </div>
      ) : (
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={24}
          className="block w-full rounded-xl border border-stone-300 bg-white px-3 py-3 font-mono text-sm leading-relaxed focus:border-amber-700 focus:outline-none"
        />
      )}

      {pendientes.length > 0 ? (
        <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
          <p className="font-medium">Falta completar antes de publicar:</p>
          <ul className="mt-1 list-disc pl-5">
            {pendientes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-stone-600">
          Al publicar, cada persona del equipo verá esta versión al entrar y
          quedará registrado cuándo la vio. Las versiones anteriores se
          conservan.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={publicar}
        disabled={publicando || pendientes.length > 0 || sinCambios}
        className="w-full rounded-lg bg-amber-800 px-4 py-3 font-medium text-white hover:bg-amber-900 disabled:opacity-50"
      >
        {publicando
          ? "Publicando…"
          : hayAviso
            ? "Publicar nueva versión"
            : "Publicar aviso"}
      </button>
    </div>
  );
}
