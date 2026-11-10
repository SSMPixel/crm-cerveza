import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { FormVisita } from "./FormVisita";

export default function PaginaVisita(props: PageProps<"/cuentas/[id]/visita">) {
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
  params: PageProps<"/cuentas/[id]/visita">["params"];
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  const supabase = await crearClienteServidor();

  const { data: c } = await supabase
    .from("vista_cuentas")
    .select(
      "id, nombre, kam_id, lat, lng, etapa, accion_descripcion, empresa_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  if (perfil?.rol !== "kam" || c.kam_id !== perfil.id) {
    return (
      <>
        <Link href={`/cuentas/${id}`} className="text-sm text-stone-600">
          ← {c.nombre}
        </Link>
        <p className="mt-4 text-stone-700">
          Solo el KAM asignado puede registrar visitas en esta cuenta.
        </p>
      </>
    );
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("radio_checkin_m")
    .eq("id", c.empresa_id)
    .maybeSingle();

  return (
    <>
      <Link href={`/cuentas/${id}`} className="text-sm text-stone-600">
        ← {c.nombre}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Registrar visita</h1>
      <p className="text-stone-600">{c.nombre}</p>
      <FormVisita
        cuentaId={c.id}
        cuentaLat={c.lat}
        cuentaLng={c.lng}
        radio={empresa?.radio_checkin_m ?? 300}
        etapaActual={c.etapa}
        accionPendiente={c.accion_descripcion}
      />
    </>
  );
}
