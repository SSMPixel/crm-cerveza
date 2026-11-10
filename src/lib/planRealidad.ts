// Plan contra realidad: lo que la app le propuso al KAM en la mañana
// contra lo que de verdad visitó ese día.
import type { SupabaseClient } from "@supabase/supabase-js";

export type DiaPlan = {
  kam_id: string;
  fecha: string; // AAAA-MM-DD (CDMX)
  planeadas: number;
  cumplidas: number;
  /** Cuentas visitadas que no estaban en el plan. */
  fueraDePlan: number;
  /** Cuentas del plan que no visitó. */
  faltaron: { id: string; nombre: string }[];
};

const diaMx = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});

export async function planContraRealidad(
  supabase: SupabaseClient,
  opciones: {
    empresaId: string | null;
    kamId?: string | null;
    desde: string; // AAAA-MM-DD
    hasta: string; // AAAA-MM-DD
  },
): Promise<DiaPlan[]> {
  const { empresaId, kamId, desde, hasta } = opciones;
  let qPlanes = supabase
    .from("planes_dia")
    .select("kam_id, fecha, cuentas")
    .gte("fecha", desde)
    .lte("fecha", hasta);
  // Margen de un día en UTC; luego se filtra por fecha de CDMX.
  let qVisitas = supabase
    .from("visitas")
    .select("kam_id, cuenta_id, fecha_hora")
    .gte("fecha_hora", `${desde}T00:00:00-06:00`)
    .lt(
      "fecha_hora",
      new Date(
        Date.parse(`${hasta}T00:00:00-06:00`) + 86_400_000,
      ).toISOString(),
    );
  if (empresaId) {
    qPlanes = qPlanes.eq("empresa_id", empresaId);
    qVisitas = qVisitas.eq("empresa_id", empresaId);
  }
  if (kamId) {
    qPlanes = qPlanes.eq("kam_id", kamId);
    qVisitas = qVisitas.eq("kam_id", kamId);
  }
  const [{ data: planes, error }, { data: visitas }] = await Promise.all([
    qPlanes,
    qVisitas,
  ]);
  if (error || !planes?.length) return [];

  // Visitas por KAM y día.
  const visitadas = new Map<string, Set<string>>();
  for (const v of visitas ?? []) {
    const clave = `${v.kam_id}|${diaMx.format(new Date(v.fecha_hora))}`;
    if (!visitadas.has(clave)) visitadas.set(clave, new Set());
    visitadas.get(clave)!.add(v.cuenta_id);
  }

  const faltantes = new Set<string>();
  const dias = planes.map((p) => {
    const hechas = visitadas.get(`${p.kam_id}|${p.fecha}`) ?? new Set();
    const plan = p.cuentas as string[];
    const faltaron = plan.filter((id) => !hechas.has(id));
    faltaron.forEach((id) => faltantes.add(id));
    return {
      kam_id: p.kam_id as string,
      fecha: p.fecha as string,
      planeadas: plan.length,
      cumplidas: plan.length - faltaron.length,
      fueraDePlan: [...hechas].filter((id) => !plan.includes(id)).length,
      faltaronIds: faltaron,
    };
  });

  const nombres = new Map<string, string>();
  if (faltantes.size) {
    const { data } = await supabase
      .from("cuentas")
      .select("id, nombre")
      .in("id", [...faltantes]);
    for (const c of data ?? []) nombres.set(c.id, c.nombre);
  }

  return dias
    .map(({ faltaronIds, ...d }) => ({
      ...d,
      faltaron: faltaronIds.map((id) => ({
        id,
        nombre: nombres.get(id) ?? "Cuenta",
      })),
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** % de cumplimiento sumando varios días. null si no hubo plan. */
export function cumplimiento(dias: DiaPlan[]) {
  const planeadas = dias.reduce((s, d) => s + d.planeadas, 0);
  const cumplidas = dias.reduce((s, d) => s + d.cumplidas, 0);
  return planeadas
    ? { planeadas, cumplidas, pct: Math.round((cumplidas / planeadas) * 100) }
    : null;
}
