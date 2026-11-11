"use client";

// Al entrar por primera vez (o cuando cambia), el personal del cliente ve el
// aviso de privacidad y deja constancia de que lo tuvo a la vista.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TextoAviso } from "./TextoAviso";
import { registrarConstancia } from "@/app/(app)/aviso/acciones";

export function AvisoObligatorio({
  avisoId,
  version,
  texto,
  empresa,
}: {
  avisoId: string;
  version: number;
  texto: string;
  empresa: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  function continuar() {
    setError(null);
    iniciar(async () => {
      try {
        const r = await registrarConstancia(avisoId);
        if ("error" in r) setError(r.error);
        else router.refresh();
      } catch {
        setError("No se pudo guardar: revisa tu conexión.");
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-aviso"
      className="fixed inset-0 z-[1300] flex flex-col bg-stone-50"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-4 pt-6">
        <p className="text-sm text-stone-600">{empresa}</p>
        <h1 id="titulo-aviso" className="text-xl font-semibold">
          Antes de empezar
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Lee cómo se usan tus datos en esta herramienta. Lo puedes volver a
          consultar cuando quieras en Mi perfil.
        </p>
        <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-stone-200 bg-white p-4">
          <TextoAviso texto={texto} />
          <p className="mt-4 text-xs text-stone-500">Versión {version}</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-sm text-stone-700">
          He tenido a mi disposición el aviso de privacidad de {empresa},
          versión {version}, y puedo consultarlo en cualquier momento.
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={continuar}
          disabled={guardando}
          className="mt-3 w-full rounded-lg bg-amber-800 px-4 py-3 font-medium text-white hover:bg-amber-900 disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
