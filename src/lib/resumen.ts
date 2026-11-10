// =====================================================================
// Resumen semanal del manager: datos de los últimos 7 días de una empresa.
// Recibe el cliente de Supabase para servir igual en la vista previa (con la
// sesión del usuario) que en el envío automático (con la llave secreta).
// =====================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarClientes } from "@/lib/datosClientes";
import type { Alerta } from "@/lib/alertas";
import { hoyMx } from "@/lib/formato";

export type Semaforo = "bien" | "atencion" | "mal";

export type FilaKam = {
  nombre: string;
  visitas: number;
  meta: number;
  fueraDeRango: number;
  pedidos: number;
  avances: number;
  atrasadas: number;
  alDia: number;
  cartera: number;
  semaforo: Semaforo;
};

export type CuentaUrgente = {
  nombre: string;
  zona: string | null;
  kam: string | null;
  categoria: string;
  motivo: string;
};

export type DatosResumen = {
  empresa: string;
  desde: string; // AAAA-MM-DD
  hasta: string;
  totales: {
    visitas: number;
    meta: number;
    fueraDeRango: number;
    pedidos: number;
    avances: number;
    alDia: number;
    cartera: number;
  };
  kams: FilaKam[];
  alertas: Alerta[];
  urgentes: CuentaUrgente[];
  managers: { nombre: string; correo: string }[];
};

const DIAS_HABILES = 5;

function semaforo(visitas: number, meta: number, fuera: number): Semaforo {
  const cumplimiento = meta > 0 ? visitas / meta : 1;
  const pctFuera = visitas > 0 ? fuera / visitas : 0;
  if (cumplimiento >= 0.8 && pctFuera <= 0.2) return "bien";
  if (cumplimiento >= 0.5 && pctFuera <= 0.4) return "atencion";
  return "mal";
}

export async function datosResumen(
  supabase: SupabaseClient,
  empresaId: string,
): Promise<DatosResumen | null> {
  const hasta = hoyMx();
  const desde = new Date(Date.parse(`${hasta}T12:00:00Z`) - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const desdeTs = `${desde}T00:00:00-06:00`;

  const [empresa, gente, cuentas, visitas, pedidos, cambios, [cliente]] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("nombre, meta_visitas_dia")
        .eq("id", empresaId)
        .maybeSingle(),
      supabase
        .from("perfiles")
        .select("id, nombre, correo, rol, meta_visitas_dia")
        .eq("empresa_id", empresaId)
        .eq("activo", true),
      supabase
        .from("vista_cuentas")
        .select(
          "nombre, zona, categoria, kam_id, kam_nombre, estado_seguimiento, accion_fecha, accion_descripcion, toca_visita, dias_sin_visita",
        )
        .eq("empresa_id", empresaId),
      supabase
        .from("visitas")
        .select("kam_id, fuera_de_rango")
        .eq("empresa_id", empresaId)
        .gte("fecha_hora", desdeTs),
      supabase
        .from("pedidos")
        .select("kam_id, monto_mxn")
        .eq("empresa_id", empresaId)
        .gte("fecha", desde),
      supabase
        .from("cambios_etapa")
        .select("etapa_anterior, etapa_nueva, cuentas(kam_id)")
        .eq("empresa_id", empresaId)
        .gte("fecha", desdeTs)
        .not("etapa_anterior", "is", null),
      cargarClientes(empresaId, supabase),
    ]);

  if (!empresa.data) return null;
  const metaEmpresa = empresa.data.meta_visitas_dia;
  const listaCuentas = cuentas.data ?? [];
  const listaVisitas = visitas.data ?? [];
  const listaPedidos = pedidos.data ?? [];
  // "Avance" = cualquier cambio de etapa que no sea a perdido.
  const avancesPorKam = new Map<string, number>();
  for (const c of cambios.data ?? []) {
    if (c.etapa_nueva === "perdido") continue;
    const kam = (c.cuentas as unknown as { kam_id: string | null } | null)
      ?.kam_id;
    if (kam) avancesPorKam.set(kam, (avancesPorKam.get(kam) ?? 0) + 1);
  }

  const kams: FilaKam[] = (gente.data ?? [])
    .filter((p) => p.rol === "kam")
    .map((k) => {
      const susVisitas = listaVisitas.filter((v) => v.kam_id === k.id);
      const fuera = susVisitas.filter((v) => v.fuera_de_rango).length;
      const meta = (k.meta_visitas_dia ?? metaEmpresa) * DIAS_HABILES;
      const cartera = listaCuentas.filter(
        (c) => c.kam_id === k.id && c.estado_seguimiento !== "cerrada",
      );
      return {
        nombre: k.nombre,
        visitas: susVisitas.length,
        meta,
        fueraDeRango: fuera,
        pedidos: listaPedidos
          .filter((p) => p.kam_id === k.id)
          .reduce((s, p) => s + Number(p.monto_mxn), 0),
        avances: avancesPorKam.get(k.id) ?? 0,
        atrasadas: cartera.filter((c) => c.estado_seguimiento === "vencida")
          .length,
        alDia: cartera.filter((c) => c.estado_seguimiento === "al_dia").length,
        cartera: cartera.length,
        semaforo: semaforo(susVisitas.length, meta, fuera),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const vigentes = listaCuentas.filter(
    (c) => c.estado_seguimiento !== "cerrada",
  );
  const urgentes: CuentaUrgente[] = vigentes
    .filter(
      (c) =>
        c.estado_seguimiento === "vencida" || c.estado_seguimiento === "hoy",
    )
    .sort(
      (a, b) =>
        a.categoria.localeCompare(b.categoria) ||
        String(a.toca_visita).localeCompare(String(b.toca_visita)),
    )
    .slice(0, 5)
    .map((c) => ({
      nombre: c.nombre,
      zona: c.zona,
      kam: c.kam_nombre,
      categoria: c.categoria,
      motivo:
        c.accion_descripcion && c.accion_fecha && c.accion_fecha <= hasta
          ? `Pendiente: ${c.accion_descripcion}`
          : c.dias_sin_visita === null
            ? "Nunca visitada"
            : `${c.dias_sin_visita} días sin visita`,
    }));

  return {
    empresa: empresa.data.nombre,
    desde,
    hasta,
    totales: {
      visitas: listaVisitas.length,
      meta: kams.reduce((s, k) => s + k.meta, 0),
      fueraDeRango: listaVisitas.filter((v) => v.fuera_de_rango).length,
      pedidos: listaPedidos.reduce((s, p) => s + Number(p.monto_mxn), 0),
      avances: [...avancesPorKam.values()].reduce((s, n) => s + n, 0),
      alDia: vigentes.filter((c) => c.estado_seguimiento === "al_dia").length,
      cartera: vigentes.length,
    },
    kams,
    alertas: cliente?.alertas ?? [],
    urgentes,
    managers: (gente.data ?? [])
      .filter((p) => p.rol === "manager")
      .map((m) => ({ nombre: m.nombre, correo: m.correo })),
  };
}
