import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { avisoVigente, plantillaAvisoEquipo } from "@/lib/avisoEquipo";
import { EditorAviso } from "./EditorAviso";

export const metadata = { title: "Aviso de privacidad del equipo" };

export default function PaginaEditorAviso() {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/equipo" className="text-sm text-stone-600">
          ← Equipo y ajustes
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Aviso de privacidad</h1>
        <Suspense fallback={<p className="mt-4 text-stone-500">Cargando…</p>}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam") redirect("/");
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) redirect("/clientes");

  const supabase = await crearClienteServidor();
  const [aviso, { data: empresa }] = await Promise.all([
    avisoVigente(supabase, empresaId),
    supabase
      .from("empresas")
      .select("nombre")
      .eq("id", empresaId)
      .maybeSingle(),
  ]);
  const nombre = empresa?.nombre ?? "la empresa";

  return (
    <>
      <p className="mt-1 text-stone-600">
        {aviso
          ? `Versión ${aviso.version} publicada. Si la cambias, todo el equipo verá la nueva al entrar.`
          : `${nombre} es responsable de los datos de su equipo en la app. Completa los datos entre corchetes y publícalo: todos lo verán al entrar.`}
      </p>
      <EditorAviso
        inicial={aviso?.texto ?? plantillaAvisoEquipo(nombre)}
        plantilla={plantillaAvisoEquipo(nombre)}
        hayAviso={!!aviso}
      />
    </>
  );
}
