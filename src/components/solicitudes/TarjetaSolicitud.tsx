"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Solicitud } from "@/lib/solicitudes";
import {
  cancelarSolicitud,
  resolverSolicitud,
} from "@/app/(app)/solicitudes/acciones";

const fecha = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
});

export function textoSolicitud(s: Solicitud) {
  return s.tipo === "reasignar"
    ? `pasar a ${s.destino ?? "otro KAM"}`
    : "dar por perdida";
}

/**
 * modo "resolver": el manager aprueba o rechaza.
 * modo "propia": el KAM que la pidió (puede cancelarla mientras esté pendiente).
 */
export function TarjetaSolicitud({
  s,
  modo,
  mostrarCuenta = false,
}: {
  s: Solicitud;
  modo: "resolver" | "propia" | "ver";
  mostrarCuenta?: boolean;
}) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function hacer(accion: () => Promise<{ ok: true } | { error: string }>) {
    setError(null);
    iniciar(async () => {
      try {
        const r = await accion();
        if ("error" in r) setError(r.error);
        else router.refresh();
      } catch {
        setError("No se pudo guardar: revisa tu conexión.");
      }
    });
  }

  const pendiente = s.estado === "pendiente";
  const color = pendiente
    ? "border-amber-700/40 bg-amber-50"
    : s.estado === "aprobada"
      ? "border-green-200 bg-green-50"
      : "border-stone-200 bg-white";

  return (
    <div className={`rounded-xl border p-3 text-sm ${color}`}>
      <p className="text-stone-900">
        {mostrarCuenta ? (
          <>
            <Link
              href={`/cuentas/${s.cuenta_id}`}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {s.cuenta}
            </Link>
            {": "}
          </>
        ) : null}
        <span className="font-medium">
          {modo === "propia" ? "Pediste" : `${s.solicitante} pide`}{" "}
          {textoSolicitud(s)}
        </span>
        <span className="text-stone-500">
          {" "}
          · {fecha.format(new Date(s.creada_en))}
        </span>
      </p>
      {s.motivo && <p className="mt-1 text-stone-700">“{s.motivo}”</p>}

      {!pendiente && (
        <p
          className={`mt-2 font-medium ${s.estado === "aprobada" ? "text-green-800" : "text-stone-800"}`}
        >
          {s.estado === "aprobada" ? "✓ Aprobada" : "✕ Rechazada"}
          {s.respuesta && (
            <span className="font-normal text-stone-700">
              {" "}
              · “{s.respuesta}”
            </span>
          )}
        </p>
      )}

      {pendiente && modo === "propia" && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-stone-600">Esperando al manager</span>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => hacer(() => cancelarSolicitud(s.id))}
            className="text-sm font-medium text-stone-700 underline underline-offset-4"
          >
            Cancelar
          </button>
        </div>
      )}

      {pendiente && modo === "resolver" && !rechazando && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => setRechazando(true)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-medium text-stone-800"
          >
            Rechazar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => hacer(() => resolverSolicitud(s.id, true, ""))}
            className="rounded-lg bg-amber-800 px-3 py-2 font-medium text-white hover:bg-amber-900 disabled:opacity-60"
          >
            {ocupado ? "Guardando…" : "Aprobar"}
          </button>
        </div>
      )}
      {pendiente && modo === "resolver" && rechazando && (
        <div className="mt-3 space-y-2">
          <textarea
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            rows={2}
            autoFocus
            placeholder="¿Por qué? (opcional, lo verá el KAM)"
            className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base focus:border-amber-700 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRechazando(false)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-medium"
            >
              Volver
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() =>
                hacer(() => resolverSolicitud(s.id, false, respuesta))
              }
              className="rounded-lg bg-red-700 px-3 py-2 font-medium text-white disabled:opacity-60"
            >
              {ocupado ? "Guardando…" : "Rechazar"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
