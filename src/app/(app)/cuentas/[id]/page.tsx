import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import {
  capitalizar,
  estados,
  estiloCategoria,
  nombreEtapa,
  textoFechaAccion,
  textoFechaPasada,
  textoUltimaVisita,
  type EstadoSeguimiento,
} from "@/lib/formato";
import { ligaComoLlegar, textoDistancia } from "@/lib/geo";
import { ligaCorreo, ligaLlamada, ligaWhatsApp } from "@/lib/contacto";
import { AvancePedidos } from "@/components/AvancePedidos";

const nombreObjetivo: Record<string, string> = {
  grifo: "Grifo",
  carta: "En carta",
  exhibicion: "Exhibición",
};

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default function PaginaCuenta(props: PageProps<"/cuentas/[id]">) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<p className="text-stone-500">Cargando cuenta…</p>}>
          <DetalleCuenta
            params={props.params}
            searchParams={props.searchParams}
          />
        </Suspense>
      </div>
    </main>
  );
}

async function DetalleCuenta({
  params,
  searchParams,
}: {
  params: PageProps<"/cuentas/[id]">["params"];
  searchParams: PageProps<"/cuentas/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { registrada } = await searchParams;
  const perfil = await obtenerPerfil();
  const supabase = await crearClienteServidor();

  const [{ data: c }, { data: visitas }, { data: objetivos }] =
    await Promise.all([
      supabase.from("vista_cuentas").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("visitas")
        .select(
          "id, fecha_hora, distancia_m, fuera_de_rango, motivo_fuera_rango, nota",
        )
        .eq("cuenta_id", id)
        .order("fecha_hora", { ascending: false })
        .limit(5),
      supabase
        .from("objetivos_cuenta")
        .select("tipo, logrado")
        .eq("cuenta_id", id),
    ]);

  if (!c) notFound();

  const estado = estados[c.estado_seguimiento as EstadoSeguimiento];
  const puedeRegistrar =
    perfil?.rol === "kam" && c.kam_id === perfil.id && c.etapa !== "perdido";
  const comoLlegar = ligaComoLlegar(c.lat, c.lng, c.direccion);
  const atajos = [
    { texto: "Llamar", href: ligaLlamada(c.contacto_telefono) },
    { texto: "WhatsApp", href: ligaWhatsApp(c.contacto_telefono) },
    { texto: "Correo", href: ligaCorreo(c.contacto_correo) },
    { texto: "Cómo llegar", href: comoLlegar },
  ];
  const muestraPedidos =
    c.objetivo_mensual_mxn !== null ||
    Number(c.pedidos_mes_mxn) > 0 ||
    c.ultimo_pedido_mxn !== null;

  return (
    <>
      <Link href="/cuentas" className="text-sm text-stone-600">
        ← Cuentas
      </Link>

      {registrada && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Visita registrada.
        </p>
      )}

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{c.nombre}</h1>
          <p className="text-stone-600">
            {[capitalizar(c.tipo_lugar), c.zona].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg font-bold ${estiloCategoria[c.categoria]}`}
          aria-label={`Categoría ${c.categoria}`}
        >
          {c.categoria}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900">
          {nombreEtapa[c.etapa]}
        </span>
        <span className={`flex items-center gap-1.5 ${estado.texto}`}>
          <span className={`size-2 rounded-full ${estado.punto}`} aria-hidden />
          {estado.singular}
        </span>
        <span className="text-stone-600">
          {textoUltimaVisita(c.dias_sin_visita)}
        </span>
        {perfil?.rol !== "kam" && c.kam_nombre && (
          <span className="text-stone-600">· {c.kam_nombre}</span>
        )}
      </div>

      {c.accion_descripcion && (
        <section className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-600">
            Próxima acción
          </h2>
          <p className="mt-1">{c.accion_descripcion}</p>
          <p className="text-sm text-stone-500">
            {textoFechaAccion(c.accion_fecha)}
          </p>
        </section>
      )}

      <div className="mt-4 space-y-2">
        {puedeRegistrar && (
          <Link
            href={`/cuentas/${c.id}/visita`}
            className="block rounded-lg bg-amber-800 px-4 py-3 text-center font-medium text-white hover:bg-amber-900"
          >
            Registrar visita
          </Link>
        )}
        <div className="grid grid-cols-4 gap-2">
          {atajos.map((a) =>
            a.href ? (
              <a
                key={a.texto}
                href={a.href}
                target={a.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="rounded-lg border border-stone-300 bg-white px-1 py-2.5 text-center text-sm font-medium text-stone-800 active:bg-stone-50"
              >
                {a.texto}
              </a>
            ) : (
              <span
                key={a.texto}
                title="Falta el dato en la cuenta"
                aria-disabled="true"
                className="rounded-lg border border-dashed border-stone-300 px-1 py-2.5 text-center text-sm text-stone-400"
              >
                {a.texto}
              </span>
            ),
          )}
        </div>
      </div>

      {muestraPedidos && (
        <section className="mt-6">
          <h2 className="font-semibold">Pedidos</h2>
          <div className="mt-2">
            <AvancePedidos
              pedidosMes={Number(c.pedidos_mes_mxn)}
              objetivo={
                c.objetivo_mensual_mxn !== null
                  ? Number(c.objetivo_mensual_mxn)
                  : null
              }
              ultimoMonto={
                c.ultimo_pedido_mxn !== null
                  ? Number(c.ultimo_pedido_mxn)
                  : null
              }
              ultimoTexto={
                c.ultimo_pedido_fecha
                  ? textoFechaPasada(c.ultimo_pedido_fecha)
                  : null
              }
            />
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">Datos</h2>
        <dl className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white text-sm">
          <Fila etiqueta="Dirección" valor={c.direccion} />
          <Fila etiqueta="Contacto" valor={c.contacto_nombre} />
          <Fila etiqueta="Teléfono" valor={c.contacto_telefono} />
          <Fila etiqueta="Correo" valor={c.contacto_correo} />
        </dl>
      </section>

      {objetivos && objetivos.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Objetivos</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {objetivos.map((o) => (
              <li
                key={o.tipo}
                className={`rounded-full px-3 py-1 ${o.logrado ? "bg-green-100 text-green-900" : "border border-stone-300 text-stone-500"}`}
              >
                {o.logrado ? "✓ " : ""}
                {nombreObjetivo[o.tipo]}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">Últimas visitas</h2>
        {!visitas || visitas.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">Todavía no hay visitas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {visitas.map((v) => (
              <li
                key={v.id}
                className="rounded-xl border border-stone-200 bg-white p-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">
                    {formatoFecha.format(new Date(v.fecha_hora))}
                  </span>
                  {v.fuera_de_rango ? (
                    <span className="text-orange-700">
                      Fuera de rango
                      {v.distancia_m !== null
                        ? ` · ${textoDistancia(v.distancia_m)}`
                        : ""}
                    </span>
                  ) : (
                    v.distancia_m !== null && (
                      <span className="text-stone-500">
                        {textoDistancia(v.distancia_m)}
                      </span>
                    )
                  )}
                </div>
                {v.motivo_fuera_rango && (
                  <p className="mt-1 text-stone-600">
                    Motivo: {v.motivo_fuera_rango}
                  </p>
                )}
                {v.nota && <p className="mt-1 text-stone-800">{v.nota}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Fila({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 px-3 py-2.5">
      <dt className="text-stone-600">{etiqueta}</dt>
      <dd className="text-right text-stone-900">
        {valor ?? <span className="text-stone-400">—</span>}
      </dd>
    </div>
  );
}
