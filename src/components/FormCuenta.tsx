"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { capitalizar, nombreEtapa, tiposLugar } from "@/lib/formato";
import { guardarCuenta } from "@/app/(app)/cuentas/acciones";

export type DatosCuenta = {
  id?: string;
  nombre?: string;
  tipo_lugar?: string | null;
  zona?: string | null;
  direccion?: string | null;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_correo?: string | null;
  categoria?: string;
  objetivo_mensual_mxn?: number | null;
  kam_id?: string | null;
};

const estilo =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20";

const etapasAlta = [
  "prospecto",
  "contactado",
  "degustacion",
  "negociacion",
  "primer_pedido",
  "activo",
];

export function FormCuenta({
  cuenta,
  esKam,
  kams,
}: {
  cuenta?: DatosCuenta;
  esKam: boolean;
  kams: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();
  const nueva = !cuenta?.id;

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get("nombre") ?? "").trim()) {
      setError("Escribe el nombre de la cuenta.");
      return;
    }
    setError("");
    iniciar(async () => {
      try {
        const r = await guardarCuenta(cuenta?.id ?? null, fd);
        if (r.id) router.push(`/cuentas/${r.id}`);
        else setError(r.error ?? "No se pudo guardar.");
      } catch {
        setError(
          "No se pudo guardar: parece que no hay conexión. Lo que escribiste sigue aquí.",
        );
      }
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="mt-6 space-y-5">
      <Campo etiqueta="Nombre del lugar">
        <input
          name="nombre"
          defaultValue={cuenta?.nombre ?? ""}
          className={estilo}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Tipo">
          <select
            name="tipo_lugar"
            defaultValue={cuenta?.tipo_lugar ?? ""}
            className={estilo}
          >
            <option value="">Elegir…</option>
            {tiposLugar.map((t) => (
              <option key={t} value={t}>
                {capitalizar(t)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Zona o colonia">
          <input
            name="zona"
            defaultValue={cuenta?.zona ?? ""}
            placeholder="Roma Norte"
            className={estilo}
          />
        </Campo>
      </div>

      <Campo
        etiqueta="Dirección"
        ayuda="Con calle y número la ubicamos en el mapa. Si no, la primera visita la fija."
      >
        <input
          name="direccion"
          defaultValue={cuenta?.direccion ?? ""}
          placeholder="Colima 166"
          className={estilo}
        />
      </Campo>

      <fieldset className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <legend className="px-1 font-medium">Contacto</legend>
        <Campo etiqueta="Nombre">
          <input
            name="contacto_nombre"
            defaultValue={cuenta?.contacto_nombre ?? ""}
            className={estilo}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Teléfono / WhatsApp">
            <input
              name="contacto_telefono"
              inputMode="tel"
              defaultValue={cuenta?.contacto_telefono ?? ""}
              placeholder="55 1234 5678"
              className={estilo}
            />
          </Campo>
          <Campo etiqueta="Correo">
            <input
              name="contacto_correo"
              type="email"
              inputMode="email"
              defaultValue={cuenta?.contacto_correo ?? ""}
              className={estilo}
            />
          </Campo>
        </div>
      </fieldset>

      {nueva && (
        <Campo etiqueta="Etapa">
          <select name="etapa" defaultValue="prospecto" className={estilo}>
            {etapasAlta.map((e) => (
              <option key={e} value={e}>
                {nombreEtapa[e]}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {esKam ? (
        nueva && (
          <p className="text-sm text-stone-600">
            La cuenta queda como categoría C. Tu manager puede subirla después.
          </p>
        )
      ) : (
        <fieldset className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <legend className="px-1 font-medium">Lo decide el manager</legend>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Categoría">
              <select
                name="categoria"
                defaultValue={cuenta?.categoria ?? "C"}
                className={estilo}
              >
                <option value="A">A · semanal</option>
                <option value="B">B · quincenal</option>
                <option value="C">C · mensual</option>
              </select>
            </Campo>
            <Campo etiqueta="Objetivo mensual">
              <input
                name="objetivo"
                inputMode="decimal"
                defaultValue={cuenta?.objetivo_mensual_mxn ?? ""}
                placeholder="$"
                className={estilo}
              />
            </Campo>
          </div>
          <Campo etiqueta="KAM asignado">
            <select
              name="kam_id"
              defaultValue={cuenta?.kam_id ?? ""}
              className={estilo}
            >
              <option value="">Sin asignar</option>
              {kams.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </fieldset>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <button
        disabled={guardando}
        className="w-full rounded-lg bg-amber-800 px-4 py-3.5 font-medium text-white hover:bg-amber-900 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : nueva ? "Crear cuenta" : "Guardar cambios"}
      </button>
    </form>
  );
}

function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-800">{etiqueta}</span>
      {children}
      {ayuda && (
        <span className="mt-1 block text-xs text-stone-500">{ayuda}</span>
      )}
    </label>
  );
}
