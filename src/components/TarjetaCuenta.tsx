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
  estado_seguimiento: EstadoSeguimiento;
};

export const camposCuenta =
  "id, nombre, tipo_lugar, zona, categoria, etapa, kam_id, kam_nombre, dias_sin_visita, accion_descripcion, accion_fecha, toca_visita, estado_seguimiento";

export function TarjetaCuenta({
  cuenta: c,
  mostrarKam = false,
}: {
  cuenta: Cuenta;
  mostrarKam?: boolean;
}) {
  const accionVencida =
    c.accion_fecha !== null &&
    textoFechaAccion(c.accion_fecha).startsWith("venció");

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{c.nombre}</p>
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
        <span className="text-stone-600">
          {textoUltimaVisita(c.dias_sin_visita)}
        </span>
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
    </li>
  );
}
