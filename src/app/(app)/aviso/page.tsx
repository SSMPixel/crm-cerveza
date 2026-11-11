import Link from "next/link";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { avisoVigente } from "@/lib/avisoEquipo";
import { TextoAviso } from "@/components/privacidad/TextoAviso";

export const metadata = { title: "Aviso de privacidad" };

const fecha = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function PaginaAviso() {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/perfil" className="text-sm text-stone-600">
          ← Mi perfil
        </Link>
        <Suspense fallback={<p className="mt-4 text-stone-500">Cargando…</p>}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const perfil = await obtenerPerfil();
  if (!perfil) return null;
  const empresaId = await empresaEnVista(perfil);
  const supabase = await crearClienteServidor();
  const aviso = empresaId ? await avisoVigente(supabase, empresaId) : null;
  const puedeEditar = perfil.rol !== "kam";

  if (!aviso)
    return (
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Aviso de privacidad</h1>
        <p className="mt-2 text-stone-700">
          {puedeEditar
            ? "Tu equipo todavía no tiene un aviso de privacidad publicado. Es necesario antes de trabajar con datos reales."
            : "Tu empresa todavía no publica su aviso de privacidad en la app."}
        </p>
        {puedeEditar && (
          <Link
            href="/equipo/aviso"
            className="mt-3 inline-block rounded-lg bg-amber-800 px-4 py-2 font-medium text-white hover:bg-amber-900"
          >
            Preparar el aviso
          </Link>
        )}
      </div>
    );

  const { data: constancia } = await supabase
    .from("constancias_aviso")
    .select("vista_en")
    .eq("perfil_id", perfil.id)
    .eq("aviso_id", aviso.id)
    .maybeSingle();

  return (
    <>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-stone-600">
          Versión {aviso.version} · publicada el{" "}
          {fecha.format(new Date(aviso.publicado_en))}
          {constancia &&
            ` · lo viste el ${fecha.format(new Date(constancia.vista_en))}`}
        </p>
        {puedeEditar && (
          <Link
            href="/equipo/aviso"
            className="text-sm font-medium text-amber-800 underline-offset-4 hover:underline"
          >
            Actualizar
          </Link>
        )}
      </div>
      <article className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
        <TextoAviso texto={aviso.texto} />
      </article>
    </>
  );
}
