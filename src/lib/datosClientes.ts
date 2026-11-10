// Datos del panel del auditor: métricas y alertas de cada cliente.
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearClienteServidor } from "@/lib/supabase/server";
import { calcularAlertas, puntajeAtencion, type Alerta } from "@/lib/alertas";
import { hoyMx, inicioDeHoyMx } from "@/lib/formato";

export type ResumenCliente = {
  id: string;
  nombre: string;
  managers: {
    id: string;
    nombre: string;
    correo: string;
    telefono: string | null;
  }[];
  visitasHoy: number;
  metaHoy: number;
  cuentasVigentes: number;
  alDia: number;
  atrasadas: number;
  fueraDeRango7d: number;
  visitas7d: number;
  pedidosMes: number;
  objetivoMes: number;
  alertas: Alerta[];
  puntaje: number;
};

// `cliente` permite usarlo desde el envío automático (sin usuario con sesión).
export async function cargarClientes(
  soloEmpresa?: string,
  cliente?: SupabaseClient,
): Promise<ResumenCliente[]> {
  const supabase = cliente ?? (await crearClienteServidor());
  const hoy = hoyMx();
  const hace7 = new Date(
    Date.parse(`${hoy}T00:00:00-06:00`) - 6 * 86_400_000,
  ).toISOString();

  let qEmpresas = supabase
    .from("empresas")
    .select("id, nombre, meta_visitas_dia")
    .order("nombre");
  let qPerfiles = supabase
    .from("perfiles")
    .select("id, empresa_id, nombre, correo, telefono, rol, meta_visitas_dia")
    .in("rol", ["kam", "manager"])
    .eq("activo", true);
  let qCuentas = supabase
    .from("vista_cuentas")
    .select(
      "empresa_id, kam_id, estado_seguimiento, contacto_telefono, lat, pedidos_mes_mxn, objetivo_mensual_mxn",
    );
  let qVisitas = supabase
    .from("visitas")
    .select("empresa_id, kam_id, fecha_hora, fuera_de_rango")
    .gte("fecha_hora", hace7);
  let qCambios = supabase
    .from("cambios_etapa")
    .select("empresa_id, cuentas(kam_id)")
    .gte("fecha", hace7)
    .not("etapa_anterior", "is", null);

  if (soloEmpresa) {
    qEmpresas = qEmpresas.eq("id", soloEmpresa);
    qPerfiles = qPerfiles.eq("empresa_id", soloEmpresa);
    qCuentas = qCuentas.eq("empresa_id", soloEmpresa);
    qVisitas = qVisitas.eq("empresa_id", soloEmpresa);
    qCambios = qCambios.eq("empresa_id", soloEmpresa);
  }

  const [empresas, perfiles, cuentas, visitas, cambios] = await Promise.all([
    qEmpresas,
    qPerfiles,
    qCuentas,
    qVisitas,
    qCambios,
  ]);

  const inicioHoy = Date.parse(inicioDeHoyMx());

  const resumenes = (empresas.data ?? []).map((e): ResumenCliente => {
    const deEmpresa = <T extends { empresa_id: string | null }>(
      xs: T[] | null,
    ) => (xs ?? []).filter((x) => x.empresa_id === e.id);

    const gente = deEmpresa(perfiles.data);
    const kams = gente.filter((p) => p.rol === "kam");
    const susCuentas = deEmpresa(cuentas.data);
    const susVisitas = deEmpresa(visitas.data);
    const vigentes = susCuentas.filter(
      (c) => c.estado_seguimiento !== "cerrada",
    );

    const alertas = calcularAlertas({
      empresa: e.nombre,
      metaEmpresa: e.meta_visitas_dia,
      kams: kams.map((k) => ({
        id: k.id,
        nombre: k.nombre,
        meta: k.meta_visitas_dia,
      })),
      cuentas: susCuentas,
      visitas7d: susVisitas,
      cambiosEtapa7d: deEmpresa(cambios.data).map((c) => ({
        cuenta_kam_id:
          (c.cuentas as unknown as { kam_id: string | null } | null)?.kam_id ??
          null,
      })),
      hoy,
    });

    return {
      id: e.id,
      nombre: e.nombre,
      managers: gente
        .filter((p) => p.rol === "manager")
        .map((m) => ({
          id: m.id,
          nombre: m.nombre,
          correo: m.correo,
          telefono: m.telefono,
        })),
      visitasHoy: susVisitas.filter(
        (v) => Date.parse(v.fecha_hora) >= inicioHoy,
      ).length,
      metaHoy: kams.reduce(
        (s, k) => s + (k.meta_visitas_dia ?? e.meta_visitas_dia),
        0,
      ),
      cuentasVigentes: vigentes.length,
      alDia: vigentes.filter((c) => c.estado_seguimiento === "al_dia").length,
      atrasadas: vigentes.filter((c) => c.estado_seguimiento === "vencida")
        .length,
      fueraDeRango7d: susVisitas.filter((v) => v.fuera_de_rango).length,
      visitas7d: susVisitas.length,
      pedidosMes: susCuentas.reduce(
        (s, c) => s + Number(c.pedidos_mes_mxn ?? 0),
        0,
      ),
      objetivoMes: susCuentas.reduce(
        (s, c) => s + Number(c.objetivo_mensual_mxn ?? 0),
        0,
      ),
      alertas,
      puntaje: puntajeAtencion(alertas),
    };
  });

  // Primero el cliente que más atención necesita.
  return resumenes.sort(
    (a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre),
  );
}
