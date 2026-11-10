import { Suspense } from "react";
import { obtenerPerfil } from "@/lib/sesion";
import { nombreRol } from "@/lib/formato";
import { cerrarSesion } from "../../login/acciones";
import { cambiarContrasena } from "./acciones";
import { CampoContrasena } from "@/components/CampoContrasena";

export const metadata = { title: "Mi perfil" };

const errores: Record<string, string> = {
  corta: "La contraseña debe tener al menos 8 caracteres.",
  distintas: "Las dos contraseñas no coinciden.",
  guardar: "No se pudo cambiar. Inténtalo de nuevo.",
};

const estilo =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base focus:border-amber-700 focus:outline-none";

export default function PaginaPerfil(props: PageProps<"/perfil">) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
          <Contenido searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido({
  searchParams,
}: {
  searchParams: PageProps<"/perfil">["searchParams"];
}) {
  const perfil = await obtenerPerfil();
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Mi perfil</h1>
      {perfil && (
        <p className="text-stone-600">
          {perfil.nombre} · {nombreRol[perfil.rol]}
          {perfil.empresa ? ` · ${perfil.empresa}` : ""}
        </p>
      )}

      {sp.ok && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Contraseña cambiada.
        </p>
      )}
      {typeof sp.error === "string" && errores[sp.error] && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errores[sp.error]}
        </p>
      )}

      <form
        action={cambiarContrasena}
        className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4"
      >
        <h2 className="font-semibold">Cambiar contraseña</h2>
        <label className="block">
          <span className="text-sm">Nueva contraseña</span>
          <CampoContrasena
            name="nueva"
            autoComplete="new-password"
            className={estilo}
          />
        </label>
        <label className="block">
          <span className="text-sm">Repítela</span>
          <CampoContrasena
            name="confirmar"
            autoComplete="new-password"
            className={estilo}
          />
        </label>
        <button className="w-full rounded-lg bg-amber-800 px-4 py-3 font-medium text-white hover:bg-amber-900">
          Guardar contraseña
        </button>
      </form>

      <form action={cerrarSesion} className="mt-8">
        <button className="text-sm text-stone-600 underline underline-offset-4">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
