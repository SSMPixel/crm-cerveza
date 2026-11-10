import Link from "next/link";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import {
  estados,
  nombreEtapa,
  textoFechaAccion,
  textoUltimaVisita,
  type EstadoSeguimiento,
} from "@/lib/formato";

type Cuenta = {
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
  estado_seguimiento: EstadoSeguimiento;
};

const ordenEstados: EstadoSeguimiento[] = ["vencida", "hoy", "al_dia", "cerrada"];

export default function PaginaCuentas(props: PageProps<"/cuentas">) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<p className="text-stone-500">Cargando cuentas…</p>}>
          <ListaCuentas searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function ListaCuentas({
  searchParams,
}: {
  searchParams: PageProps<"/cuentas">["searchParams"];
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) {
    return <p className="text-stone-700">Tu usuario todavía no tiene perfil.</p>;
  }

  const { kam } = await searchParams;
  const kamFiltro = typeof kam === "string" ? kam : null;
  const veEquipo = perfil.rol !== "kam";

  const supabase = await crearClienteServidor();
  let consulta = supabase
    .from("vista_cuentas")
    .select(
      "id, nombre, tipo_lugar, zona, categoria, etapa, kam_id, kam_nombre, dias_sin_visita, accion_descripcion, accion_fecha, estado_seguimiento",
    )
    .order("categoria")
    .order("nombre");
  if (veEquipo && kamFiltro) consulta = consulta.eq("kam_id", kamFiltro);

  const { data, error } = await consulta;
  if (error) {
    return <p className="text-red-700">No se pudieron cargar las cuentas: {error.message}</p>;
  }
  const cuentas = (data ?? []) as Cuenta[];

  // Lista de KAMs para el filtro del manager / auditor.
  let kams: { id: string; nombre: string }[] = [];
  if (veEquipo) {
    const { data: equipo } = await supabase
      .from("perfiles")
      .select("id, nombre")
      .eq("rol", "kam")
      .eq("activo", true)
      .order("nombre");
    kams = equipo ?? [];
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{veEquipo ? "Cuentas del equipo" : "Mis cuentas"}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {cuentas.length} cuentas · lo más urgente arriba
      </p>

      {veEquipo && kams.length > 0 && (
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Filtro href="/cuentas" activo={!kamFiltro} texto="Todos" />
          {kams.map((k) => (
            <Filtro key={k.id} href={`/cuentas?kam=${k.id}`} activo={kamFiltro === k.id} texto={k.nombre} />
          ))}
        </div>
      )}

      {cuentas.length === 0 && (
        <p className="mt-8 text-stone-600">Todavía no hay cuentas asignadas.</p>
      )}

      {ordenEstados.map((estado) => {
        const grupo = cuentas.filter((c) => c.estado_seguimiento === estado);
        if (grupo.length === 0) return null;
        const e = estados[estado];
        const contenido = (
          <ul className="mt-3 space-y-2">
            {grupo.map((c) => (
              <TarjetaCuenta key={c.id} cuenta={c} mostrarKam={veEquipo && !kamFiltro} />
            ))}
          </ul>
        );
        return (
          <section key={estado} className="mt-8">
            {estado === "cerrada" ? (
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-stone-500">
                  {e.titulo} ({grupo.length})
                </summary>
                {contenido}
              </details>
            ) : (
              <>
                <h2 className={`flex items-center gap-2 text-sm font-semibold ${e.texto}`}>
                  <span className={`size-2.5 rounded-full ${e.punto}`} aria-hidden />
                  {e.titulo} ({grupo.length})
                </h2>
                {contenido}
              </>
            )}
          </section>
        );
      })}
    </>
  );
}

function Filtro({ href, activo, texto }: { href: string; activo: boolean; texto: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
        activo
          ? "border-amber-800 bg-amber-800 text-white"
          : "border-stone-300 bg-white text-stone-700"
      }`}
    >
      {texto}
    </Link>
  );
}

function TarjetaCuenta({ cuenta: c, mostrarKam }: { cuenta: Cuenta; mostrarKam: boolean }) {
  const accionVencida =
    c.accion_fecha !== null && textoFechaAccion(c.accion_fecha).startsWith("venció");
  return (
    <li className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{c.nombre}</p>
          <p className="truncate text-sm text-stone-600">
            {[c.tipo_lugar, c.zona].filter(Boolean).join(" · ")}
            {mostrarKam && c.kam_nombre ? ` · ${c.kam_nombre}` : ""}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700"
          title="Categoría"
        >
          {c.categoria}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900">
          {nombreEtapa[c.etapa] ?? c.etapa}
        </span>
        <span className="text-stone-600">{textoUltimaVisita(c.dias_sin_visita)}</span>
      </div>

      {c.accion_descripcion && c.accion_fecha && (
        <p className={`mt-2 text-sm ${accionVencida ? "text-red-700" : "text-stone-800"}`}>
          → {c.accion_descripcion}{" "}
          <span className="text-stone-500">({textoFechaAccion(c.accion_fecha)})</span>
        </p>
      )}
    </li>
  );
}
