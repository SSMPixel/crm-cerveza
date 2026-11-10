import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { kamsDeEmpresa } from "@/lib/equipo";
import { FormCuenta } from "@/components/FormCuenta";

export const metadata = { title: "Editar cuenta" };

export default function PaginaEditarCuenta(
  props: PageProps<"/cuentas/[id]/editar">,
) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
          <Contenido params={props.params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido({
  params,
}: {
  params: PageProps<"/cuentas/[id]/editar">["params"];
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/");
  const supabase = await crearClienteServidor();
  const { data: c } = await supabase
    .from("cuentas")
    .select(
      "id, empresa_id, nombre, tipo_lugar, zona, direccion, contacto_nombre, contacto_telefono, contacto_correo, categoria, objetivo_mensual_mxn, kam_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  const kams = perfil.rol === "kam" ? [] : await kamsDeEmpresa(c.empresa_id);

  return (
    <>
      <Link href={`/cuentas/${id}`} className="text-sm text-stone-600">
        ← {c.nombre}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Editar cuenta</h1>
      <FormCuenta cuenta={c} esKam={perfil.rol === "kam"} kams={kams} />
    </>
  );
}
