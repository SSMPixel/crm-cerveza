import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerPerfil } from "@/lib/sesion";
import { cargarClientes, type ResumenCliente } from "@/lib/datosClientes";
import { ListaAlertas } from "@/components/auditor/ListaAlertas";
import { AvisarManager } from "@/components/auditor/AvisarManager";
import { cerrarSesion } from "../../login/acciones";
import { entrarCliente } from "./acciones";

export const metadata = { title: "Mis clientes" };

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
  notation: "compact",
});

export default function PaginaClientes() {
  return (
    <main className="px-4 py-8">
      <div className="mx-auto w-full max-w-md sm:max-w-3xl">
        <Suspense
          fallback={<p className="text-stone-500">Cargando clientes…</p>}
        >
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "auditor") redirect("/");

  const clientes = await cargarClientes();
  const conAlertas = clientes.filter((c) =>
    c.alertas.some((a) => a.severidad !== "baja"),
  ).length;

  return (
    <>
      <p className="text-sm text-stone-600">Auditor</p>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Mis clientes</h1>
        <Link
          href="/clientes/nuevo"
          className="rounded-lg bg-amber-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-900"
        >
          + Nuevo cliente
        </Link>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
        {conAlertas > 0
          ? ` · ${conAlertas} necesitan atención`
          : " · todo en orden"}
      </p>

      {clientes.length === 0 && (
        <p className="mt-8 text-stone-700">
          Todavía no hay clientes dados de alta.
        </p>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {clientes.map((c) => (
          <TarjetaCliente key={c.id} c={c} />
        ))}
      </ul>

      <form action={cerrarSesion} className="mt-10">
        <button className="text-sm text-stone-600 underline underline-offset-4">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}

function TarjetaCliente({ c }: { c: ResumenCliente }) {
  const pctAlDia = c.cuentasVigentes
    ? Math.round((c.alDia / c.cuentasVigentes) * 100)
    : 0;
  const entrar = entrarCliente.bind(null, c.id);

  return (
    <li className="flex flex-col rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{c.nombre}</h2>
          <p className="text-sm text-stone-600">
            {c.managers.length > 0
              ? `Manager: ${c.managers.map((m) => m.nombre).join(", ")}`
              : "Sin manager"}
          </p>
        </div>
        <form action={entrar}>
          <button className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-medium text-white hover:bg-amber-900">
            Entrar
          </button>
        </form>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metrica
          etiqueta="Visitas hoy"
          valor={`${c.visitasHoy}/${c.metaHoy}`}
        />
        <Metrica
          etiqueta="Cartera al día"
          valor={`${pctAlDia}%`}
          alerta={pctAlDia < 50}
        />
        <Metrica
          etiqueta="Atrasadas"
          valor={String(c.atrasadas)}
          alerta={c.atrasadas > 0}
        />
        <Metrica
          etiqueta="Fuera de rango 7d"
          valor={`${c.fueraDeRango7d}/${c.visitas7d}`}
          alerta={c.visitas7d > 0 && c.fueraDeRango7d / c.visitas7d >= 0.2}
        />
        <Metrica
          etiqueta="Pedidos del mes"
          valor={
            c.objetivoMes > 0
              ? `${Math.round((c.pedidosMes / c.objetivoMes) * 100)}%`
              : mxn.format(c.pedidosMes)
          }
          detalle={
            c.objetivoMes > 0
              ? `${mxn.format(c.pedidosMes)} de ${mxn.format(c.objetivoMes)}`
              : undefined
          }
        />
        <Metrica etiqueta="Cuentas" valor={String(c.cuentasVigentes)} />
      </dl>

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-stone-700">Alertas</h3>
        <ListaAlertas
          alertas={c.alertas}
          managers={c.managers}
          cliente={c.nombre}
          maximo={3}
        />
      </div>

      {c.managers.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <AvisarManager
            managers={c.managers}
            asunto={`Seguimiento ${c.nombre}`}
            mensaje="Hola, ¿tienes 15 minutos esta semana para revisar cómo va el equipo?"
          />
        </div>
      )}
    </li>
  );
}

function Metrica({
  etiqueta,
  valor,
  detalle,
  alerta = false,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-2">
      <dd
        className={`text-lg font-semibold tabular-nums ${alerta ? "text-orange-700" : "text-stone-900"}`}
      >
        {valor}
      </dd>
      <dt className="text-[11px] leading-tight text-stone-600">{etiqueta}</dt>
      {detalle && (
        <p className="mt-0.5 text-[10px] text-stone-500">{detalle}</p>
      )}
    </div>
  );
}
