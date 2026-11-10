import Link from "next/link";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { BotonDescargar } from "@/components/BotonDescargar";
import { empresaEnVista } from "@/lib/clienteActivo";
import { redirect } from "next/navigation";
import { estados, type EstadoSeguimiento } from "@/lib/formato";
import {
  TarjetaCuenta,
  camposCuenta,
  type Cuenta,
} from "@/components/TarjetaCuenta";

const ordenEstados: EstadoSeguimiento[] = [
  "vencida",
  "hoy",
  "al_dia",
  "cerrada",
];

export default function PaginaCuentas(props: PageProps<"/cuentas">) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-3xl">
        <Suspense
          fallback={<p className="text-stone-500">Cargando cuentas…</p>}
        >
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
    return (
      <p className="text-stone-700">Tu usuario todavía no tiene perfil.</p>
    );
  }

  const { kam } = await searchParams;
  const kamFiltro = typeof kam === "string" ? kam : null;
  const veEquipo = perfil.rol !== "kam";
  const empresaId = await empresaEnVista(perfil);
  if (perfil.rol === "auditor" && !empresaId) redirect("/clientes");

  const supabase = await crearClienteServidor();
  let consulta = supabase
    .from("vista_cuentas")
    .select(camposCuenta)
    .order("categoria")
    .order("nombre");
  if (veEquipo && kamFiltro) consulta = consulta.eq("kam_id", kamFiltro);
  if (empresaId) consulta = consulta.eq("empresa_id", empresaId);

  const { data, error } = await consulta;
  if (error) {
    return (
      <p className="text-red-700">
        No se pudieron cargar las cuentas: {error.message}
      </p>
    );
  }
  const cuentas = (data ?? []) as Cuenta[];

  // Lista de KAMs para el filtro del manager / auditor.
  let kams: { id: string; nombre: string }[] = [];
  if (veEquipo) {
    let qEquipo = supabase
      .from("perfiles")
      .select("id, nombre")
      .eq("rol", "kam")
      .eq("activo", true)
      .order("nombre");
    if (empresaId) qEquipo = qEquipo.eq("empresa_id", empresaId);
    const { data: equipo } = await qEquipo;
    kams = equipo ?? [];
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {veEquipo ? "Cuentas del equipo" : "Mis cuentas"}
        </h1>
        <BotonDescargar
          href={
            kamFiltro
              ? `/exportar/cuentas?kam=${kamFiltro}`
              : "/exportar/cuentas"
          }
        />
      </div>
      <p className="mt-1 text-sm text-stone-600">
        {cuentas.length} cuentas · lo más urgente arriba
      </p>

      {veEquipo && kams.length > 0 && (
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Filtro href="/cuentas" activo={!kamFiltro} texto="Todos" />
          {kams.map((k) => (
            <Filtro
              key={k.id}
              href={`/cuentas?kam=${k.id}`}
              activo={kamFiltro === k.id}
              texto={k.nombre}
            />
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
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {grupo.map((c) => (
              <TarjetaCuenta
                key={c.id}
                cuenta={c}
                mostrarKam={veEquipo && !kamFiltro}
              />
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
                <h2
                  className={`flex items-center gap-2 text-sm font-semibold ${e.texto}`}
                >
                  <span
                    className={`size-2.5 rounded-full ${e.punto}`}
                    aria-hidden
                  />
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

function Filtro({
  href,
  activo,
  texto,
}: {
  href: string;
  activo: boolean;
  texto: string;
}) {
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
