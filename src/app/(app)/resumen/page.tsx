import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { datosResumen } from "@/lib/resumen";
import { htmlResumen } from "@/lib/correoResumen";
import { enviarmePrueba, guardarHorario } from "./acciones";

const dias = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function PaginaResumen(props: PageProps<"/resumen">) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <Suspense
          fallback={<p className="text-stone-500">Preparando el resumen…</p>}
        >
          <Contenido searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido({
  searchParams,
}: {
  searchParams: PageProps<"/resumen">["searchParams"];
}) {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam") redirect("/");
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) redirect("/clientes");

  const sp = await searchParams;
  const supabase = await crearClienteServidor();
  const [datos, { data: empresa }] = await Promise.all([
    datosResumen(supabase, empresaId),
    supabase
      .from("empresas")
      .select("resumen_dia, resumen_hora")
      .eq("id", empresaId)
      .maybeSingle(),
  ]);
  if (!datos)
    return <p className="text-stone-700">No se encontró la empresa.</p>;

  const h = await headers();
  const html = htmlResumen(datos, `https://${h.get("host")}`);
  const turno =
    Number(String(empresa?.resumen_hora ?? "08").slice(0, 2)) < 12
      ? "manana"
      : "tarde";

  return (
    <>
      <h1 className="text-2xl font-semibold">Resumen semanal</h1>
      <p className="mt-1 text-sm text-stone-600">
        Así se ve el correo de esta semana. Llega a{" "}
        {datos.managers.length
          ? datos.managers.map((m) => m.nombre).join(", ")
          : "nadie (no hay manager)"}
        {perfil.rol === "auditor" ? ", con copia para ti" : ""}.
      </p>

      {sp.enviado && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Te mandamos el correo de prueba. Revisa tu bandeja (y la de spam).
        </p>
      )}
      {sp.guardado && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Horario guardado.
        </p>
      )}
      {typeof sp.error === "string" && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          No se pudo enviar: {sp.error}
        </p>
      )}

      <section className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <form
          action={guardarHorario}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="block">
            <span className="text-sm text-stone-600">Día</span>
            <select
              name="dia"
              defaultValue={empresa?.resumen_dia ?? 1}
              className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2"
            >
              {dias.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-600">Turno</span>
            <select
              name="turno"
              defaultValue={turno}
              className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2"
            >
              <option value="manana">Mañana (7 a 8 am)</option>
              <option value="tarde">Tarde (4 a 5 pm)</option>
            </select>
          </label>
          <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-medium">
            Guardar
          </button>
        </form>
        <form action={enviarmePrueba}>
          <button className="w-full rounded-lg bg-amber-800 px-4 py-2 font-medium text-white hover:bg-amber-900">
            Enviarme una prueba
          </button>
        </form>
      </section>

      <iframe
        title="Vista previa del correo"
        srcDoc={html}
        className="mt-5 h-[1400px] w-full rounded-xl border border-stone-200 bg-white"
      />
    </>
  );
}
