// Plan del día del KAM: se calcula y se fija la primera vez que abre la app
// en el día, y ya no cambia. Así el manager puede comparar plan contra realidad.
import type { SupabaseClient } from "@supabase/supabase-js";
import { elegirPlan, ordenarRuta, type CuentaRuta } from "@/lib/ruta";

type CuentaPlan = CuentaRuta & { visitada_hoy: boolean };

export async function planDelDia<T extends CuentaPlan>(
  supabase: SupabaseClient,
  cuentas: T[],
  meta: number,
  hechas: number,
) {
  const vigentes = cuentas.filter((c) => c.estado_seguimiento !== "cerrada");
  const faltan = Math.max(meta - hechas, 0);
  const sugerido = ordenarRuta(elegirPlan(vigentes, faltan));

  const { data, error } = await supabase.rpc("fijar_plan_dia", {
    p_cuentas: sugerido.map((c) => c.id),
  });
  const ids = (data as string[] | null) ?? null;
  // Sin plan guardado (o si la base aún no tiene la función), el sugerido.
  if (error || !ids) return { plan: sugerido, extra: [] as T[] };

  const porId = new Map(cuentas.map((c) => [c.id, c]));
  const plan = ids
    .map((id) => porId.get(id))
    .filter((c): c is T => c !== undefined);

  // Plan cumplido pero aún le falta para la meta: sugerencias extra.
  const extra =
    faltan > 0 && plan.every((c) => c.visitada_hoy)
      ? ordenarRuta(
          elegirPlan(
            vigentes.filter((c) => !ids.includes(c.id) && !c.visitada_hoy),
            faltan,
          ),
        )
      : [];
  return { plan, extra };
}
