"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";

export type Respuesta = { ok: true } | { error: string };

export async function agregarComentario(
  cuentaId: string,
  texto: string,
  interna: boolean,
): Promise<Respuesta> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const limpio = texto.trim();
  if (!limpio) return { error: "Escribe un mensaje." };
  if (limpio.length > 2000) return { error: "El mensaje es demasiado largo." };

  const supabase = await crearClienteServidor();
  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("empresa_id")
    .eq("id", cuentaId)
    .maybeSingle();
  if (!cuenta) return { error: "No encontramos la cuenta." };

  const { error } = await supabase.from("comentarios").insert({
    empresa_id: cuenta.empresa_id,
    cuenta_id: cuentaId,
    autor_id: perfil.id,
    texto: limpio,
    visibilidad: interna && perfil.rol !== "kam" ? "privada_manager" : "equipo",
  });
  if (error)
    return {
      error: error.message.includes("row-level security")
        ? "No puedes escribir en esta cuenta."
        : "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.",
    };
  // Lo que uno mismo escribe cuenta como visto.
  await supabase.rpc("marcar_comentarios_vistos", { p_cuenta: cuentaId });
  revalidatePath(`/cuentas/${cuentaId}`);
  return { ok: true };
}

export async function marcarVistos(cuentaId: string) {
  const supabase = await crearClienteServidor();
  await supabase.rpc("marcar_comentarios_vistos", { p_cuenta: cuentaId });
}
