import { Suspense } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";
import { inicioDeHoyMx } from "@/lib/formato";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { redirect } from "next/navigation";
import { planDelDia } from "@/lib/planDelDia";
import { camposCuenta, type Cuenta } from "@/components/TarjetaCuenta";
import { VistaMapa } from "@/components/mapa/VistaMapa";

export const metadata = { title: "Mapa" };

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
  const empresaId = await empresaEnVista(perfil);
  if (perfil.rol === "auditor" && !empresaId) redirect("/clientes");
  let qCuentas = supabase.from("vista_cuentas").select(camposCuenta);
  if (empresaId) qCuentas = qCuentas.eq("empresa_id", empresaId);
  const { data } = await qCuentas;
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
    // El mismo plan fijo de Inicio; en el mapa solo lo que falta por visitar.
    const fijo = await planDelDia(supabase, cuentas, meta, count ?? 0);
    plan = [...fijo.plan.filter((c) => !c.visitada_hoy), ...fijo.extra];
  }

  return (
    <VistaMapa cuentas={cuentas} plan={plan} esKam={perfil.rol === "kam"} />
  );
}
