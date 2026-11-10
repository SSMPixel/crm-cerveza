import Link from "next/link";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil, type Perfil } from "@/lib/sesion";
import {
  estados,
  inicioDeHoyMx,
  nombreRol,
  type EstadoSeguimiento,
} from "@/lib/formato";
import {
  TarjetaCuenta,
  camposCuenta,
  type Cuenta,
} from "@/components/TarjetaCuenta";
import { cerrarSesion } from "../login/acciones";

export default function Inicio() {
  return (
    <main className="px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const perfil = await obtenerPerfil();

  if (!perfil) {
    return (
      <>
        <h1 className="text-2xl font-semibold">Sesión iniciada</h1>
        <p className="mt-2 text-stone-700">
          Tu usuario todavía no tiene perfil. Pide a tu manager que te dé de
          alta.
        </p>
        <CerrarSesion />
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-stone-600">
        {nombreRol[perfil.rol]}
        {perfil.empresa ? ` · ${perfil.empresa}` : ""}
      </p>
      <h1 className="text-2xl font-semibold">Hola, {perfil.nombre}</h1>
      {perfil.rol === "kam" ? <DiaDelKam perfil={perfil} /> : <ResumenEquipo />}
      <CerrarSesion />
    </>
  );
}

// ---------------------------------------------------------------------
// KAM: una meta alcanzable para hoy y un plan corto, no una lista de deudas.
// ---------------------------------------------------------------------
const prioridadEstado: Record<EstadoSeguimiento, number> = {
  hoy: 0,
  vencida: 1,
  al_dia: 2,
  cerrada: 3,
};

async function DiaDelKam({ perfil }: { perfil: Perfil }) {
  const supabase = await crearClienteServidor();

  const [{ data: empresa }, { count: visitasHoy }, { data: cuentasData }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("meta_visitas_dia")
        .eq("id", perfil.empresa_id!)
        .maybeSingle(),
      supabase
        .from("visitas")
        .select("id", { count: "exact", head: true })
        .eq("kam_id", perfil.id)
        .gte("fecha_hora", inicioDeHoyMx()),
      supabase.from("vista_cuentas").select(camposCuenta),
    ]);

  const meta = empresa?.meta_visitas_dia ?? 5;
  const hechas = visitasHoy ?? 0;
  const cuentas = (cuentasData ?? []) as Cuenta[];
  const vigentes = cuentas.filter((c) => c.estado_seguimiento !== "cerrada");
  const alDia = vigentes.filter(
    (c) => c.estado_seguimiento === "al_dia",
  ).length;
  const pendientes = Math.max(meta - hechas, 0);

  const plan = vigentes
    .filter(
      (c) =>
        c.estado_seguimiento === "hoy" || c.estado_seguimiento === "vencida",
    )
    .sort(
      (a, b) =>
        prioridadEstado[a.estado_seguimiento] -
          prioridadEstado[b.estado_seguimiento] ||
        a.categoria.localeCompare(b.categoria) ||
        a.toca_visita.localeCompare(b.toca_visita),
    )
    .slice(0, pendientes);

  return (
    <>
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Visitas de hoy</h2>
          <p className="text-sm text-stone-600">
            <span className="text-2xl font-semibold text-stone-900">
              {hechas}
            </span>{" "}
            de {meta}
          </p>
        </div>
        <Barra valor={hechas} total={meta} />
        <p className="mt-2 text-sm text-stone-600">
          {hechas >= meta
            ? "¡Meta del día cumplida! Lo que sumes ahora es extra."
            : hechas === 0
              ? "Empieza con la primera de tu plan."
              : `Vas bien, te faltan ${pendientes}.`}
        </p>
      </section>

      {plan.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Tu plan de hoy</h2>
          <p className="text-sm text-stone-600">
            Las que más conviene visitar, en este orden.
          </p>
          <ol className="mt-3 space-y-2">
            {plan.map((c) => (
              <TarjetaCuenta key={c.id} cuenta={c} />
            ))}
          </ol>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Tu cartera</h2>
          <p className="text-sm text-stone-600">
            <span className="font-semibold text-stone-900">{alDia}</span> de{" "}
            {vigentes.length} al día
          </p>
        </div>
        <Barra valor={alDia} total={vigentes.length} />
        <Link
          href="/cuentas"
          className="mt-3 inline-block text-sm font-medium text-amber-800"
        >
          Ver todas mis cuentas →
        </Link>
      </section>
    </>
  );
}

function Barra({ valor, total }: { valor: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div
      className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100"
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className="h-full rounded-full bg-amber-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Manager y auditor: los números sin suavizar, por KAM.
// ---------------------------------------------------------------------
async function ResumenEquipo() {
  const supabase = await crearClienteServidor();
  const [{ data: cuentasData }, { data: visitasData }] = await Promise.all([
    supabase
      .from("vista_cuentas")
      .select("kam_id, kam_nombre, estado_seguimiento"),
    supabase
      .from("visitas")
      .select("kam_id")
      .gte("fecha_hora", inicioDeHoyMx()),
  ]);

  const cuentas = cuentasData ?? [];
  const total = (e: EstadoSeguimiento) =>
    cuentas.filter((c) => c.estado_seguimiento === e).length;

  const porKam = new Map<
    string,
    {
      nombre: string;
      vencida: number;
      hoy: number;
      al_dia: number;
      visitas: number;
    }
  >();
  for (const c of cuentas) {
    if (!c.kam_id || c.estado_seguimiento === "cerrada") continue;
    const fila = porKam.get(c.kam_id) ?? {
      nombre: c.kam_nombre ?? "Sin nombre",
      vencida: 0,
      hoy: 0,
      al_dia: 0,
      visitas: 0,
    };
    fila[c.estado_seguimiento as "vencida" | "hoy" | "al_dia"]++;
    porKam.set(c.kam_id, fila);
  }
  for (const v of visitasData ?? []) {
    const fila = porKam.get(v.kam_id);
    if (fila) fila.visitas++;
  }
  const filas = [...porKam.entries()].sort(
    (a, b) => b[1].vencida - a[1].vencida,
  );

  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {(["vencida", "hoy", "al_dia"] as const).map((e) => (
          <Link
            key={e}
            href="/cuentas"
            className="rounded-xl border border-stone-200 bg-white p-3 text-center"
          >
            <p className={`text-3xl font-semibold ${estados[e].texto}`}>
              {total(e)}
            </p>
            <p className="mt-1 text-xs text-stone-600">{estados[e].titulo}</p>
          </Link>
        ))}
      </div>

      {filas.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Por KAM</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs text-stone-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">KAM</th>
                  <th className="px-2 py-2 text-right font-medium">
                    Atrasadas
                  </th>
                  <th className="px-2 py-2 text-right font-medium">Hoy</th>
                  <th className="px-2 py-2 text-right font-medium">Al día</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Visitas hoy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filas.map(([id, f]) => (
                  <tr key={id}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/cuentas?kam=${id}`}
                        className="font-medium text-amber-800"
                      >
                        {f.nombre}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-orange-700">
                      {f.vencida}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {f.hoy}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {f.al_dia}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {f.visitas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Link
        href="/cuentas"
        className="mt-4 block rounded-lg bg-amber-800 px-4 py-3 text-center font-medium text-white hover:bg-amber-900"
      >
        Ver cuentas del equipo
      </Link>
    </>
  );
}

function CerrarSesion() {
  return (
    <form action={cerrarSesion} className="mt-10">
      <button className="text-sm text-stone-600 underline underline-offset-4">
        Cerrar sesión
      </button>
    </form>
  );
}
