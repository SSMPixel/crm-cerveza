"use client";

// El KAM pide al manager pasar la cuenta a otro KAM o darla por perdida.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pedirCambio } from "@/app/(app)/solicitudes/acciones";
import { motivosPerdida } from "@/lib/solicitudes";

const estilo =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base focus:border-amber-700 focus:outline-none";

export function PedirCambio({
  cuentaId,
  kams,
}: {
  cuentaId: string;
  kams: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"reasignar" | "perdida" | null>(null);
  const [motivoRapido, setMotivoRapido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const detalle = String(fd.get("detalle") ?? "").trim();
    fd.set("motivo", [motivoRapido, detalle].filter(Boolean).join(". "));
    fd.set("tipo", tipo ?? "");
    setError(null);
    iniciar(async () => {
      try {
        const r = await pedirCambio(cuentaId, fd);
        if ("error" in r) setError(r.error);
        else {
          setTipo(null);
          router.refresh();
        }
      } catch {
        setError("No se pudo enviar: revisa tu conexión.");
      }
    });
  }

  if (!tipo)
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo("reasignar")}
          disabled={kams.length === 0}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 disabled:opacity-50"
        >
          Pasar a otro KAM
        </button>
        <button
          type="button"
          onClick={() => setTipo("perdida")}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800"
        >
          Dar por perdida
        </button>
      </div>
    );

  return (
    <form
      onSubmit={enviar}
      className="space-y-3 rounded-xl border border-stone-200 bg-white p-4"
    >
      <h3 className="font-semibold">
        {tipo === "reasignar" ? "Pasar a otro KAM" : "Dar por perdida"}
      </h3>
      {tipo === "reasignar" ? (
        <label className="block">
          <span className="text-sm text-stone-700">¿A quién?</span>
          <select name="destino" required defaultValue="" className={estilo}>
            <option value="" disabled>
              Elige un KAM
            </option>
            {kams.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div>
          <span className="text-sm text-stone-700">¿Qué pasó?</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {motivosPerdida.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={motivoRapido === m}
                onClick={() => setMotivoRapido(motivoRapido === m ? null : m)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  motivoRapido === m
                    ? "border-amber-800 bg-amber-800 text-white"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="block">
        <span className="text-sm text-stone-700">
          {tipo === "reasignar" ? "Motivo" : "Detalles"}{" "}
          {tipo === "perdida" && motivoRapido && (
            <span className="text-stone-500">(opcional)</span>
          )}
        </span>
        <textarea
          name="detalle"
          rows={2}
          placeholder={
            tipo === "reasignar"
              ? "Ej. Le queda más cerca de su ruta"
              : "Lo que el manager deba saber"
          }
          className={estilo}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <p className="text-sm text-stone-600">
        Le llega a tu manager para que lo apruebe. Mientras, la cuenta sigue
        siendo tuya.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setTipo(null);
            setError(null);
            setMotivoRapido(null);
          }}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-medium"
        >
          Cancelar
        </button>
        <button
          disabled={enviando}
          className="rounded-lg bg-amber-800 px-3 py-2.5 font-medium text-white hover:bg-amber-900 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}
