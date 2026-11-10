import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { hoyMx, nombreResultado } from "@/lib/formato";
import { textoDistancia } from "@/lib/geo";
import { ligasFotos } from "@/lib/fotos";
import { Miniaturas } from "@/components/Miniaturas";
import { BotonDescargar } from "@/components/BotonDescargar";
import { PlanRealidad } from "@/components/PlanRealidad";
import { planContraRealidad } from "@/lib/planRealidad";

export const metadata = { title: "Historial" };

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
const diaLargo = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const fechaCorta = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const diaMx = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});

const periodos = [
  { valor: "1", texto: "Hoy" },
  { valor: "7", texto: "7 días" },
  { valor: "30", texto: "30 días" },
];

type Visita = {
  id: string;
  fecha_hora: string;
  distancia_m: number | null;
  fuera_de_rango: boolean;
  motivo_fuera_rango: string | null;
  nota: string | null;
  resultado: string | null;
  fotos: string[];
  kam_id: string;
  cuenta_id: string;
  cuentas: { nombre: string; zona: string | null } | null;
  perfiles: { nombre: string } | null;
  pedidos: { monto_mxn: number }[];
  proximas_acciones: { descripcion: string; fecha_compromiso: string }[];
};

export default function PaginaVisitas(props: PageProps<"/visitas">) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-3xl">
        <Suspense
          fallback={<p className="text-stone-500">Cargando historial…</p>}
        >
          <Historial searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Historial({
  searchParams,
}: {
  searchParams: PageProps<"/visitas">["searchParams"];
}) {
  const perfil = await obtenerPerfil();
  if (!perfil)
    return (
      <p className="text-stone-700">Tu usuario todavía no tiene perfil.</p>
    );

  const sp = await searchParams;
  const kam = typeof sp.kam === "string" ? sp.kam : null;
  const dias =
    typeof sp.dias === "string" && ["1", "7", "30"].includes(sp.dias)
      ? sp.dias
      : "7";
  const soloFuera = sp.fuera === "1";
  const veEquipo = perfil.rol !== "kam";

  // El auditor necesita un cliente activo, salvo que venga de una alerta con un KAM concreto.
  const empresaId = await empresaEnVista(perfil);
  if (perfil.rol === "auditor" && !empresaId && !kam) redirect("/clientes");

  const supabase = await crearClienteServidor();
  const desde = new Date(
    Date.parse(`${hoyMx()}T00:00:00-06:00`) - (Number(dias) - 1) * 86_400_000,
  ).toISOString();

  let q = supabase
    .from("visitas")
    .select(
      "id, fecha_hora, distancia_m, fuera_de_rango, motivo_fuera_rango, nota, resultado, fotos, kam_id, cuenta_id, cuentas(nombre, zona), perfiles(nombre), pedidos(monto_mxn), proximas_acciones(descripcion, fecha_compromiso)",
    )
    .gte("fecha_hora", desde)
    .order("fecha_hora", { ascending: false })
    .limit(300);
  if (veEquipo && kam) q = q.eq("kam_id", kam);
  else if (empresaId && veEquipo) q = q.eq("empresa_id", empresaId);
  if (soloFuera) q = q.eq("fuera_de_rango", true);

  let qKams = supabase
    .from("perfiles")
    .select("id, nombre")
    .eq("rol", "kam")
    .eq("activo", true)
    .order("nombre");
  if (empresaId) qKams = qKams.eq("empresa_id", empresaId);

  const hoy = hoyMx();
  const desdeDia = new Date(
    Date.parse(`${hoy}T12:00:00Z`) - (Number(dias) - 1) * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const [{ data, error }, { data: kamsData }, planes] = await Promise.all([
    q,
    veEquipo ? qKams : Promise.resolve({ data: [] }),
    planContraRealidad(supabase, {
      empresaId: veEquipo && kam ? null : empresaId,
      kamId: veEquipo ? kam : perfil.id,
      desde: desdeDia,
      hasta: hoy,
    }),
  ]);
  if (error)
    return (
      <p className="text-red-700">
        No se pudo cargar el historial: {error.message}
      </p>
    );

  const visitas = (data ?? []) as unknown as Visita[];
  const kams = (kamsData ?? []) as { id: string; nombre: string }[];
  const nombreKam = kam
    ? (kams.find((k) => k.id === kam)?.nombre ?? visitas[0]?.perfiles?.nombre)
    : null;

  const fuera = visitas.filter((v) => v.fuera_de_rango).length;
  const fotosLigas = await ligasFotos(visitas.flatMap((v) => v.fotos ?? []));
  const pedidos = visitas.reduce(
    (s, v) => s + v.pedidos.reduce((t, p) => t + Number(p.monto_mxn), 0),
    0,
  );

  // Agrupar por día (CDMX).
  const porDia = new Map<string, Visita[]>();
  for (const v of visitas) {
    const d = diaMx.format(new Date(v.fecha_hora));
    porDia.set(d, [...(porDia.get(d) ?? []), v]);
  }

  const liga = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const valores = { kam, dias, fuera: soloFuera ? "1" : null, ...cambios };
    for (const [k, v] of Object.entries(valores)) if (v) p.set(k, v);
    return `/visitas?${p.toString()}`;
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {veEquipo
            ? nombreKam
              ? `Visitas de ${nombreKam}`
              : "Historial de visitas"
            : "Mis visitas"}
        </h1>
        <BotonDescargar
          href={liga({}).replace("/visitas?", "/exportar/visitas?")}
        />
      </div>
      <p className="mt-1 text-sm text-stone-600">
        {visitas.length} visitas
        {fuera > 0 && (
          <span className="text-orange-700"> · {fuera} fuera de rango</span>
        )}
        {pedidos > 0 && ` · ${mxn.format(pedidos)} en pedidos`}
      </p>

      {/* ---------- Filtros ---------- */}
      <div className="mt-4 space-y-2">
        {veEquipo && kams.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Filtro href={liga({ kam: null })} activo={!kam} texto="Todos" />
            {kams.map((k) => (
              <Filtro
                key={k.id}
                href={liga({ kam: k.id })}
                activo={kam === k.id}
                texto={k.nombre}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {periodos.map((p) => (
            <Filtro
              key={p.valor}
              href={liga({ dias: p.valor })}
              activo={dias === p.valor}
              texto={p.texto}
            />
          ))}
          <Filtro
            href={liga({ fuera: soloFuera ? null : "1" })}
            activo={soloFuera}
            texto="Solo fuera de rango"
            naranja
          />
        </div>
      </div>

      <PlanRealidad
        dias={planes}
        kams={veEquipo && !kam ? kams : undefined}
        liga={(id) => liga({ kam: id })}
      />

      {visitas.length === 0 && (
        <p className="mt-8 text-stone-600">No hay visitas con estos filtros.</p>
      )}

      {[...porDia.entries()].map(([dia, lista]) => (
        <section key={dia} className="mt-6">
          <h2 className="text-sm font-semibold capitalize text-stone-600">
            {diaLargo.format(new Date(`${dia}T12:00:00Z`))} · {lista.length}
          </h2>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2">
            {lista.map((v) => {
              const pedido = v.pedidos.reduce(
                (t, p) => t + Number(p.monto_mxn),
                0,
              );
              const accion = v.proximas_acciones[0];
              return (
                <li
                  key={v.id}
                  className="rounded-xl border border-stone-200 bg-white p-3 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <Link
                      href={`/cuentas/${v.cuenta_id}`}
                      className="font-medium text-stone-900"
                    >
                      {v.cuentas?.nombre}
                    </Link>
                    <span className="shrink-0 text-stone-500">
                      {hora.format(new Date(v.fecha_hora))}
                    </span>
                  </div>
                  <p className="text-stone-600">
                    {[
                      veEquipo && !kam ? v.perfiles?.nombre : null,
                      v.cuentas?.zona,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {v.fuera_de_rango ? (
                      <span className="rounded-md bg-orange-50 px-2 py-0.5 text-orange-800">
                        Fuera de rango
                        {v.distancia_m !== null
                          ? ` · ${textoDistancia(v.distancia_m)}`
                          : " · sin ubicación"}
                        {v.motivo_fuera_rango
                          ? ` · ${v.motivo_fuera_rango}`
                          : ""}
                      </span>
                    ) : (
                      v.distancia_m !== null && (
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-600">
                          En el lugar · {textoDistancia(v.distancia_m)}
                        </span>
                      )
                    )}
                    {pedido > 0 && (
                      <span className="rounded-md bg-green-50 px-2 py-0.5 text-green-800">
                        Pedido {mxn.format(pedido)}
                      </span>
                    )}
                    {v.resultado && (
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-700">
                        {nombreResultado[v.resultado]}
                      </span>
                    )}
                  </div>

                  {v.nota && <p className="mt-1.5 text-stone-800">{v.nota}</p>}
                  <Miniaturas rutas={v.fotos ?? []} ligas={fotosLigas} />
                  {accion && (
                    <p className="mt-1.5 text-stone-600">
                      → {accion.descripcion}{" "}
                      <span className="text-stone-400">
                        (para el{" "}
                        {fechaCorta.format(
                          new Date(`${accion.fecha_compromiso}T12:00:00Z`),
                        )}
                        )
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}

function Filtro({
  href,
  activo,
  texto,
  naranja = false,
}: {
  href: string;
  activo: boolean;
  texto: string;
  naranja?: boolean;
}) {
  const color = naranja
    ? "border-orange-600 bg-orange-600"
    : "border-amber-800 bg-amber-800";
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
        activo
          ? `${color} text-white`
          : "border-stone-300 bg-white text-stone-700"
      }`}
    >
      {texto}
    </Link>
  );
}
