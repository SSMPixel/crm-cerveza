import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { inicioDeHoyMx } from "@/lib/formato";
import { obtenerPerfil } from "@/lib/sesion";
import { elegirPlan, ordenarRuta } from "@/lib/ruta";
import { camposCuenta, type Cuenta } from "@/components/TarjetaCuenta";
import { VistaMapa } from "@/components/mapa/VistaMapa";

export default function PaginaMapa() {
  return (
    <Suspense fallback={<p className="p-4 text-stone-500">Cargando mapa…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const perfil = await obtenerPerfil();
  if (!perfil)
    return (
      <p className="p-4 text-stone-700">Tu usuario todavía no tiene perfil.</p>
    );

  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("vista_cuentas").select(camposCuenta);
  const cuentas = (data ?? []) as Cuenta[];

  let plan: Cuenta[] = [];
  if (perfil.rol === "kam") {
    const [{ data: metas }, { count }] = await Promise.all([
      supabase
        .from("perfiles")
        .select("meta_visitas_dia, empresas(meta_visitas_dia)")
        .eq("id", perfil.id)
        .maybeSingle(),
      supabase
        .from("visitas")
        .select("id", { count: "exact", head: true })
        .eq("kam_id", perfil.id)
        .gte("fecha_hora", inicioDeHoyMx()),
    ]);
    const metaEmpresa = (
      metas?.empresas as unknown as { meta_visitas_dia: number } | null
    )?.meta_visitas_dia;
    const meta = metas?.meta_visitas_dia ?? metaEmpresa ?? 5;
    const vigentes = cuentas.filter((c) => c.estado_seguimiento !== "cerrada");
    plan = ordenarRuta(elegirPlan(vigentes, Math.max(meta - (count ?? 0), 0)));
  }

  return (
    <VistaMapa cuentas={cuentas} plan={plan} esKam={perfil.rol === "kam"} />
  );
}
