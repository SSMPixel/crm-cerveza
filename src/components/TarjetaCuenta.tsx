import Link from "next/link";
import {
  capitalizar,
  estiloCategoria,
  nombreEtapa,
  textoFechaAccion,
  textoUltimaVisita,
  type EstadoSeguimiento,
} from "@/lib/formato";

export type Cuenta = {
  id: string;
  nombre: string;
  tipo_lugar: string | null;
  zona: string | null;
  categoria: "A" | "B" | "C";
  etapa: string;
  kam_id: string | null;
  kam_nombre: string | null;
  dias_sin_visita: number | null;
  accion_descripcion: string | null;
  accion_fecha: string | null;
  toca_visita: string;
  visitada_hoy: boolean;
  lat: number | null;
  lng: number | null;
  estado_seguimiento: EstadoSeguimiento;
};

export const camposCuenta =
  "id, nombre, tipo_lugar, zona, categoria, etapa, kam_id, kam_nombre, dias_sin_visita, accion_descripcion, accion_fecha, toca_visita, visitada_hoy, estado_seguimiento, lat, lng";

export function TarjetaCuenta({
  cuenta: c,
  mostrarKam = false,
  numero,
  conRegistrar = false,
}: {
  cuenta: Cuenta;
  mostrarKam?: boolean;
  numero?: number;
  /** Atajo para registrar la visita sin pasar por el detalle (plan del día). */
  conRegistrar?: boolean;
}) {
  const atajo = conRegistrar && !c.visitada_hoy;
  const accionVencida =
    c.accion_fecha !== null &&
    textoFechaAccion(c.accion_fecha).startsWith("venció");

  return (
    <li>
      <Link
        href={`/cuentas/${c.id}`}
        className={`block rounded-xl border border-stone-200 bg-white p-3 transition-colors hover:border-amber-700/40 active:bg-stone-50 ${
          atajo ? "rounded-b-none border-b-0" : "h-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">
              {numero !== undefined && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-green-700 text-xs font-bold text-white">
                  {numero}
                </span>
              )}
              <span className="truncate">{c.nombre}</span>
            </p>
            <p className="truncate text-sm text-stone-600">
              {[capitalizar(c.tipo_lugar), c.zona].filter(Boolean).join(" · ")}
              {mostrarKam && c.kam_nombre ? ` · ${c.kam_nombre}` : ""}
            </p>
          </div>
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${estiloCategoria[c.categoria]}`}
            title={`Categoría ${c.categoria}`}
            aria-label={`Categoría ${c.categoria}`}
          >
            {c.categoria}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900">
            {nombreEtapa[c.etapa] ?? c.etapa}
          </span>
          {c.visitada_hoy ? (
            <span className="font-medium text-green-700">✓ Visitada hoy</span>
          ) : (
            <span className="text-stone-600">
              {textoUltimaVisita(c.dias_sin_visita)}
            </span>
          )}
        </div>

        {c.accion_descripcion && c.accion_fecha && (
          <p
            className={`mt-2 text-sm ${accionVencida ? "text-orange-700" : "text-stone-800"}`}
          >
            → {c.accion_descripcion}{" "}
            <span className="text-stone-500">
              ({textoFechaAccion(c.accion_fecha)})
            </span>
          </p>
        )}
      </Link>
      {atajo && (
        <Link
          href={`/cuentas/${c.id}/visita`}
          className="flex items-center justify-center gap-1.5 rounded-b-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-stone-100"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          Registrar visita
        </Link>
      )}
    </li>
  );
}
