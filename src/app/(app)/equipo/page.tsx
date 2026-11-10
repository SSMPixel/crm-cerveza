import { redirect } from "next/navigation";
import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { nombreRol } from "@/lib/formato";
import { FormAltaPersona } from "@/components/FormAltaPersona";
import { agregarPersona, guardarAjustes, guardarPersona } from "./acciones";

export const metadata = { title: "Equipo y ajustes" };

const estilo =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base focus:border-amber-700 focus:outline-none";

const avisos: Record<string, string> = {
  ajustes: "Ajustes guardados.",
  persona: "Cambios guardados.",
};
const errores: Record<string, string> = {
  valores: "Revisa los valores: hay alguno vacío o fuera de rango.",
  guardar: "No se pudo guardar. Inténtalo de nuevo.",
};

export default function PaginaEquipo(props: PageProps<"/equipo">) {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
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
  searchParams: PageProps<"/equipo">["searchParams"];
}) {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam") redirect("/");
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) redirect("/clientes");
  const sp = await searchParams;

  const supabase = await crearClienteServidor();
  const [{ data: empresa }, { data: gente }] = await Promise.all([
    supabase
      .from("empresas")
      .select(
        "nombre, meta_visitas_dia, frecuencia_a_dias, frecuencia_b_dias, frecuencia_c_dias, radio_checkin_m",
      )
      .eq("id", empresaId)
      .maybeSingle(),
    supabase
      .from("perfiles")
      .select("id, nombre, correo, telefono, rol, meta_visitas_dia, activo")
      .eq("empresa_id", empresaId)
      .order("rol")
      .order("nombre"),
  ]);
  if (!empresa) return <p>No se encontró la empresa.</p>;

  return (
    <>
      <h1 className="text-2xl font-semibold">Equipo y ajustes</h1>
      <p className="text-stone-600">{empresa.nombre}</p>

      {typeof sp.ok === "string" && avisos[sp.ok] && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {avisos[sp.ok]}
        </p>
      )}
      {typeof sp.error === "string" && errores[sp.error] && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errores[sp.error]}
        </p>
      )}

      {/* ---------- Ajustes de la empresa ---------- */}
      <section className="mt-6">
        <h2 className="font-semibold">Ajustes del equipo</h2>
        <form
          action={guardarAjustes}
          className="mt-2 rounded-xl border border-stone-200 bg-white p-4"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Numero
              nombre="meta"
              etiqueta="Visitas por día (meta)"
              valor={empresa.meta_visitas_dia}
            />
            <Numero
              nombre="radio"
              etiqueta="Radio de check-in (m)"
              valor={empresa.radio_checkin_m}
            />
            <span className="hidden sm:block" />
            <Numero
              nombre="frec_a"
              etiqueta="Categoría A: cada (días)"
              valor={empresa.frecuencia_a_dias}
            />
            <Numero
              nombre="frec_b"
              etiqueta="Categoría B: cada (días)"
              valor={empresa.frecuencia_b_dias}
            />
            <Numero
              nombre="frec_c"
              etiqueta="Categoría C: cada (días)"
              valor={empresa.frecuencia_c_dias}
            />
          </div>
          <button className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium">
            Guardar ajustes
          </button>
        </form>
      </section>

      {/* ---------- Personas ---------- */}
      <section className="mt-8">
        <h2 className="font-semibold">Personas</h2>
        <ul className="mt-2 space-y-3">
          {(gente ?? []).map((p) => (
            <li
              key={p.id}
              className={`rounded-xl border border-stone-200 bg-white p-4 ${p.activo ? "" : "opacity-60"}`}
            >
              <form action={guardarPersona.bind(null, p.id)}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-stone-600">
                    {nombreRol[p.rol]} · {p.correo}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="activo"
                      defaultChecked={p.activo}
                      className="size-4 accent-amber-800"
                    />
                    Activo
                  </label>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm">Nombre</span>
                    <input
                      name="nombre"
                      defaultValue={p.nombre}
                      className={estilo}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm">Teléfono</span>
                    <input
                      name="telefono"
                      inputMode="tel"
                      defaultValue={p.telefono ?? ""}
                      className={estilo}
                    />
                  </label>
                  {p.rol === "kam" && (
                    <label className="block">
                      <span className="text-sm">
                        Meta propia (vacío = la del equipo)
                      </span>
                      <input
                        name="meta"
                        inputMode="numeric"
                        defaultValue={p.meta_visitas_dia ?? ""}
                        placeholder={String(empresa.meta_visitas_dia)}
                        className={estilo}
                      />
                    </label>
                  )}
                </div>
                <button className="mt-3 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium">
                  Guardar
                </button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">
          Desactivar a alguien le quita el acceso, pero conserva su historial.
        </p>
      </section>

      {/* ---------- Alta ---------- */}
      <section className="mt-8">
        <h2 className="font-semibold">Dar de alta</h2>
        <div className="mt-2 rounded-xl border border-stone-200 bg-white p-4">
          <FormAltaPersona
            accion={agregarPersona}
            puedeManager={perfil.rol === "auditor"}
          />
        </div>
      </section>
    </>
  );
}

function Numero({
  nombre,
  etiqueta,
  valor,
}: {
  nombre: string;
  etiqueta: string;
  valor: number;
}) {
  return (
    <label className="block">
      <span className="text-sm">{etiqueta}</span>
      <input
        name={nombre}
        type="number"
        inputMode="numeric"
        defaultValue={valor}
        className={estilo}
      />
    </label>
  );
}
