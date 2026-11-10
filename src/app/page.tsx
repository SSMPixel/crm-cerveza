import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cerrarSesion } from "./login/acciones";

const nombreRol = {
  kam: "KAM",
  manager: "Manager",
  auditor: "Auditor",
} as const;

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
          <Saludo />
        </Suspense>
      </div>
    </main>
  );
}

async function Saludo() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol, empresas(nombre)")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <>
      {perfil ? (
        <>
          <p className="text-sm text-stone-600">
            {nombreRol[perfil.rol as keyof typeof nombreRol]}
          </p>
          <h1 className="text-2xl font-semibold text-stone-900">
            Hola, {perfil.nombre}
          </h1>
          {perfil.empresas && (
            <p className="mt-1 text-stone-700">
              {(perfil.empresas as unknown as { nombre: string }).nombre}
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-stone-900">
            Sesión iniciada
          </h1>
          <p className="mt-2 text-stone-700">
            Tu usuario ({user?.email}) todavía no tiene perfil. Pide a tu
            manager que te dé de alta.
          </p>
        </>
      )}

      <form action={cerrarSesion} className="mt-10">
        <button className="text-sm text-stone-600 underline underline-offset-4">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
