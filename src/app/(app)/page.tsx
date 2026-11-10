import Link from "next/link";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { estados, nombreRol, type EstadoSeguimiento } from "@/lib/formato";
import { cerrarSesion } from "../login/acciones";

export default function Inicio() {
  return (
    <main className="px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
          <Resumen />
        </Suspense>
      </div>
    </main>
  );
}

async function Resumen() {
  const perfil = await obtenerPerfil();

  if (!perfil) {
    return (
      <>
        <h1 className="text-2xl font-semibold">Sesión iniciada</h1>
        <p className="mt-2 text-stone-700">
          Tu usuario todavía no tiene perfil. Pide a tu manager que te dé de alta.
        </p>
        <CerrarSesion />
      </>
    );
  }

  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("vista_cuentas").select("estado_seguimiento");
  const conteo = (estado: EstadoSeguimiento) =>
    (data ?? []).filter((c) => c.estado_seguimiento === estado).length;

  return (
    <>
      <p className="text-sm text-stone-600">
        {nombreRol[perfil.rol]}
        {perfil.empresa ? ` · ${perfil.empresa}` : ""}
      </p>
      <h1 className="text-2xl font-semibold">Hola, {perfil.nombre}</h1>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {(["vencida", "hoy", "al_dia"] as const).map((e) => (
          <Link
            key={e}
            href="/cuentas"
            className="rounded-xl border border-stone-200 bg-white p-3 text-center"
          >
            <p className={`text-3xl font-semibold ${estados[e].texto}`}>{conteo(e)}</p>
            <p className="mt-1 text-xs text-stone-600">{estados[e].titulo}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/cuentas"
        className="mt-4 block rounded-lg bg-amber-800 px-4 py-3 text-center font-medium text-white hover:bg-amber-900"
      >
        {perfil.rol === "kam" ? "Ver mis cuentas" : "Ver cuentas del equipo"}
      </Link>

      <CerrarSesion />
    </>
  );
}

function CerrarSesion() {
  return (
    <form action={cerrarSesion} className="mt-10">
      <button className="text-sm text-stone-600 underline underline-offset-4">Cerrar sesión</button>
    </form>
  );
}
