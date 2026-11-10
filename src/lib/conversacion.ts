// Conversación por cuenta entre manager, KAM y auditor.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Comentario = {
  id: string;
  texto: string;
  interna: boolean;
  creado_en: string;
  autor_id: string;
  autor: string;
  rol: string;
};

export async function comentariosDeCuenta(
  supabase: SupabaseClient,
  cuentaId: string,
): Promise<Comentario[]> {
  const { data } = await supabase
    .from("comentarios")
    .select(
      "id, texto, visibilidad, creado_en, autor_id, perfiles(nombre, rol)",
    )
    .eq("cuenta_id", cuentaId)
    .order("creado_en")
    .limit(200);
  return (data ?? []).map((c) => {
    const p = c.perfiles as unknown as { nombre: string; rol: string } | null;
    return {
      id: c.id,
      texto: c.texto,
      interna: c.visibilidad === "privada_manager",
      creado_en: c.creado_en,
      autor_id: c.autor_id,
      autor: p?.nombre ?? "Alguien",
      rol: p?.rol ?? "",
    };
  });
}

export type SinLeer = {
  cuenta_id: string;
  cuenta: string;
  nuevos: number;
  ultimo_texto: string;
  ultimo_autor: string;
  ultimo_en: string;
};

export async function mensajesNuevos(
  supabase: SupabaseClient,
  empresaId: string | null,
): Promise<SinLeer[]> {
  const { data } = await supabase.rpc("comentarios_sin_leer", {
    p_empresa: empresaId,
  });
  return (data ?? []) as SinLeer[];
}
