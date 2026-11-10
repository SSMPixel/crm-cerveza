// Solicitudes al manager: pasar una cuenta a otro KAM o darla por perdida.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Solicitud = {
  id: string;
  cuenta_id: string;
  cuenta: string;
  tipo: "reasignar" | "perdida";
  estado: "pendiente" | "aprobada" | "rechazada";
  motivo: string | null;
  respuesta: string | null;
  solicitante_id: string;
  solicitante: string;
  destino: string | null;
  creada_en: string;
  resuelta_en: string | null;
};

const campos =
  "id, cuenta_id, tipo, estado, motivo, respuesta, solicitante_id, creada_en, resuelta_en, cuentas(nombre), solicitante:perfiles!solicitudes_solicitante_id_fkey(nombre), destino:perfiles!solicitudes_kam_destino_id_fkey(nombre)";

type Fila = Omit<Solicitud, "cuenta" | "solicitante" | "destino"> & {
  cuentas: { nombre: string } | null;
  solicitante: { nombre: string } | null;
  destino: { nombre: string } | null;
};

function aplanar(filas: unknown): Solicitud[] {
  return ((filas ?? []) as Fila[]).map(
    ({ cuentas, solicitante, destino, ...s }) => ({
      ...s,
      cuenta: cuentas?.nombre ?? "Cuenta",
      solicitante: solicitante?.nombre ?? "Alguien",
      destino: destino?.nombre ?? null,
    }),
  );
}

/** Las que esperan respuesta del manager. */
export async function solicitudesPendientes(
  supabase: SupabaseClient,
  empresaId: string,
) {
  const { data } = await supabase
    .from("solicitudes")
    .select(campos)
    .eq("empresa_id", empresaId)
    .eq("estado", "pendiente")
    .order("creada_en");
  return aplanar(data);
}

/** La pendiente de una cuenta, o la última resuelta en la semana. */
export async function solicitudDeCuenta(
  supabase: SupabaseClient,
  cuentaId: string,
) {
  const hace7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("solicitudes")
    .select(campos)
    .eq("cuenta_id", cuentaId)
    .or(`estado.eq.pendiente,resuelta_en.gte.${hace7}`)
    .order("creada_en", { ascending: false })
    .limit(1);
  return aplanar(data)[0] ?? null;
}

/** Respuestas recientes a lo que pidió un KAM (para avisarle en su inicio). */
export async function respuestasRecientes(
  supabase: SupabaseClient,
  kamId: string,
) {
  const hace3 = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("solicitudes")
    .select(campos)
    .eq("solicitante_id", kamId)
    .neq("estado", "pendiente")
    .gte("resuelta_en", hace3)
    .order("resuelta_en", { ascending: false });
  return aplanar(data);
}

export const motivosPerdida = [
  "Cerró el lugar",
  "Se fue con otra marca",
  "No paga / adeudo",
  "Ya no le interesa",
];
