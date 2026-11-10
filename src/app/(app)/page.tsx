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
import { elegirPlan, ordenarRuta } from "@/lib/ruta";
import { redirect } from "next/navigation";
import { empresaEnVista } from "@/lib/clienteActivo";
import { AlertasDelCliente } from "@/components/auditor/AlertasDelCliente";

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

  // El auditor primero elige qué cliente ver.
  const empresaId = await empresaEnVista(perfil);
  if (perfil.rol === "auditor" && !empresaId) redirect("/clientes");

  return (
    <>
      <p className="text-sm text-stone-600">
        {nombreRol[perfil.rol]}
        {perfil.empresa ? ` · ${perfil.empresa}` : ""}
      </p>
      <h1 className="text-2xl font-semibold">Hola, {perfil.nombre}</h1>
      {perfil.rol === "kam" ? (
        <DiaDelKam perfil={perfil} />
      ) : (
        <ResumenEquipo
          empresaId={empresaId}
          esAuditor={perfil.rol === "auditor"}
        />
      )}
      <CerrarSesion />
    </>
  );
}

// ---------------------------------------------------------------------
// KAM: una meta alcanzable para hoy y un plan corto, no una lista de deudas.
// ---------------------------------------------------------------------
async function DiaDelKam({ perfil }: { perfil: Perfil }) {
  const supabase = await crearClienteServidor();

  const [{ data: metas }, { count: visitasHoy }, { data: cuentasData }] =
    await Promise.all([
      supabase
        .from("perfiles")
        .select("meta_visitas_dia, empresas(meta_visitas_dia)")
        .eq("id", perfil.id)
        .maybeSingle(),
      supabase
        .from("visitas")
        .select("id", { count: "exact", head: true })
        .eq("kam_id", perfil.id)
        .gte("fecha_hora", inicioDeHoyMx()),
      supabase.from("vista_cuentas").select(camposCuenta),
    ]);

  // La meta del KAM si el manager la ajustó; si no, la de su empresa.
  const metaEmpresa = (
    metas?.empresas as unknown as { meta_visitas_dia: number } | null
  )?.meta_visitas_dia;
  const meta = metas?.meta_visitas_dia ?? metaEmpresa ?? 5;
  const hechas = visitasHoy ?? 0;
  const cuentas = (cuentasData ?? []) as Cuenta[];
  const vigentes = cuentas.filter((c) => c.estado_seguimiento !== "cerrada");
  const alDia = vigentes.filter(
    (c) => c.estado_seguimiento === "al_dia",
  ).length;
  const pendientes = Math.max(meta - hechas, 0);

  // Mismo cálculo que el mapa: urgentes agrupadas por cercanía, en orden de recorrido.
  const plan = ordenarRuta(elegirPlan(vigentes, pendientes));

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
            Las más urgentes, agrupadas por cercanía y en orden de recorrido.
          </p>
          <ol className="mt-3 space-y-2">
            {plan.map((c, i) => (
              <TarjetaCuenta key={c.id} cuenta={c} numero={i + 1} />
            ))}
          </ol>
          <Link
            href="/mapa"
            className="mt-3 block rounded-lg border border-stone-300 bg-white px-4 py-3 text-center font-medium text-stone-800"
          >
            Ver ruta en el mapa
          </Link>
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

function Barra({
  valor,
  total,
  delgada = false,
}: {
  valor: number;
  total: number;
  delgada?: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div
      className={`overflow-hidden rounded-full bg-stone-100 ${delgada ? "mt-1.5 h-1.5" : "mt-3 h-2.5"}`}
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className={`h-full rounded-full ${valor >= total && total > 0 ? "bg-green-600" : "bg-amber-700"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Manager y auditor: los números sin suavizar, por KAM.
// ---------------------------------------------------------------------
const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const hora = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "numeric",
  minute: "2-digit",
});

function haceCuanto(fecha: string) {
  const min = Math.round((Date.now() - Date.parse(fecha)) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h === 1 ? "hace 1 hora" : `hace ${h} horas`;
}

type VisitaHoy = {
  id: string;
  fecha_hora: string;
  fuera_de_rango: boolean;
  motivo_fuera_rango: string | null;
  nota: string | null;
  kam_id: string;
  cuenta_id: string;
  cuentas: { nombre: string; zona: string | null } | null;
  pedidos: { monto_mxn: number }[];
};

async function ResumenEquipo({
  empresaId,
  esAuditor,
}: {
  empresaId: string | null;
  esAuditor: boolean;
}) {
  const supabase = await crearClienteServidor();
  let qCuentas = supabase
    .from("vista_cuentas")
    .select("kam_id, estado_seguimiento");
  let qVisitas = supabase
    .from("visitas")
    .select(
      "id, fecha_hora, fuera_de_rango, motivo_fuera_rango, nota, kam_id, cuenta_id, cuentas(nombre, zona), pedidos(monto_mxn)",
    )
    .gte("fecha_hora", inicioDeHoyMx())
    .order("fecha_hora", { ascending: false });
  let qKams = supabase
    .from("perfiles")
    .select("id, nombre, meta_visitas_dia, empresas(meta_visitas_dia)")
    .eq("rol", "kam")
    .eq("activo", true)
    .order("nombre");
  if (empresaId) {
    qCuentas = qCuentas.eq("empresa_id", empresaId);
    qVisitas = qVisitas.eq("empresa_id", empresaId);
    qKams = qKams.eq("empresa_id", empresaId);
  }
  const [{ data: cuentasData }, { data: visitasData }, { data: kamsData }] =
    await Promise.all([qCuentas, qVisitas, qKams]);

  const cuentas = cuentasData ?? [];
  const visitas = (visitasData ?? []) as unknown as VisitaHoy[];
  const total = (e: EstadoSeguimiento) =>
    cuentas.filter((c) => c.estado_seguimiento === e).length;

  const kams = (kamsData ?? []).map((k) => {
    const empresa = k.empresas as unknown as {
      meta_visitas_dia: number;
    } | null;
    const suyas = visitas.filter((v) => v.kam_id === k.id);
    const deCartera = cuentas.filter((c) => c.kam_id === k.id);
    return {
      id: k.id,
      nombre: k.nombre,
      meta: k.meta_visitas_dia ?? empresa?.meta_visitas_dia ?? 5,
      hechas: suyas.length,
      ultima: suyas[0] ?? null,
      atrasadas: deCartera.filter((c) => c.estado_seguimiento === "vencida")
        .length,
      alDia: deCartera.filter((c) => c.estado_seguimiento === "al_dia").length,
    };
  });

  const totalHechas = kams.reduce((s, k) => s + k.hechas, 0);
  const totalMeta = kams.reduce((s, k) => s + k.meta, 0);
  const pedidosHoy = visitas.reduce(
    (s, v) => s + v.pedidos.reduce((t, p) => t + Number(p.monto_mxn), 0),
    0,
  );

  return (
    <>
      {esAuditor && empresaId && <AlertasDelCliente empresaId={empresaId} />}

      {/* ---------- Hoy en campo ---------- */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Hoy en campo</h2>
          <p className="text-sm text-stone-600">
            <span className="text-2xl font-semibold text-stone-900">
              {totalHechas}
            </span>{" "}
            de {totalMeta} visitas
          </p>
        </div>
        <Barra valor={totalHechas} total={totalMeta} />
        {pedidosHoy > 0 && (
          <p className="mt-2 text-sm text-stone-600">
            Pedidos reportados hoy:{" "}
            <span className="font-medium text-stone-900">
              {mxn.format(pedidosHoy)}
            </span>
          </p>
        )}

        <ul className="mt-4 space-y-4">
          {kams.map((k) => (
            <li key={k.id}>
              <div className="flex items-baseline justify-between">
                <Link
                  href={`/cuentas?kam=${k.id}`}
                  className="font-medium text-amber-800"
                >
                  {k.nombre}
                </Link>
                <span className="text-sm tabular-nums text-stone-600">
                  {k.hechas} de {k.meta}
                </span>
              </div>
              <Barra valor={k.hechas} total={k.meta} delgada />
              <p className="mt-1 text-sm text-stone-600">
                {k.ultima ? (
                  <>
                    Última: {k.ultima.cuentas?.nombre}
                    {k.ultima.cuentas?.zona
                      ? ` · ${k.ultima.cuentas.zona}`
                      : ""}{" "}
                    · {haceCuanto(k.ultima.fecha_hora)}
                  </>
                ) : (
                  "Sin visitas hoy"
                )}
              </p>
              <p className="text-xs text-stone-500">
                Cartera: {k.alDia} al día · {k.atrasadas} atrasadas
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Actividad de hoy ---------- */}
      <section className="mt-6">
        <h2 className="font-semibold">Actividad de hoy</h2>
        {visitas.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">
            Todavía no hay visitas registradas hoy.
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {visitas.map((v) => {
              const pedido = v.pedidos.reduce(
                (t, p) => t + Number(p.monto_mxn),
                0,
              );
              const kam = kams.find((k) => k.id === v.kam_id)?.nombre;
              return (
                <li key={v.id}>
                  <Link
                    href={`/cuentas/${v.cuenta_id}`}
                    className="block rounded-xl border border-stone-200 bg-white p-3 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{v.cuentas?.nombre}</span>
                      <span className="shrink-0 text-stone-500">
                        {hora.format(new Date(v.fecha_hora))}
                      </span>
                    </div>
                    <p className="text-stone-600">
                      {[kam, v.cuentas?.zona].filter(Boolean).join(" · ")}
                    </p>
                    {(pedido > 0 || v.fuera_de_rango) && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {pedido > 0 && (
                          <span className="rounded-md bg-green-50 px-2 py-0.5 text-green-800">
                            Pedido {mxn.format(pedido)}
                          </span>
                        )}
                        {v.fuera_de_rango && (
                          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-orange-800">
                            Fuera de rango
                            {v.motivo_fuera_rango
                              ? ` · ${v.motivo_fuera_rango}`
                              : ""}
                          </span>
                        )}
                      </div>
                    )}
                    {v.nota && (
                      <p className="mt-1.5 line-clamp-2 text-stone-800">
                        {v.nota}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ---------- Cartera del equipo ---------- */}
      <section className="mt-6">
        <h2 className="font-semibold">Cartera del equipo</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
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
      </section>

      <Link
        href="/resumen"
        className="mt-6 block rounded-lg border border-stone-300 bg-white px-4 py-3 text-center font-medium text-stone-800"
      >
        Ver resumen semanal
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
