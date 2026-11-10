"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";

export type Respuesta = { ok: true } | { error: string };

/** El KAM pide pasar su cuenta a otro KAM o darla por perdida. */
export async function pedirCambio(
  cuentaId: string,
  formData: FormData,
): Promise<Respuesta> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const tipo = String(formData.get("tipo") ?? "");
  const destino = String(formData.get("destino") ?? "") || null;
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (tipo !== "reasignar" && tipo !== "perdida")
    return { error: "Elige qué cambio necesitas." };
  if (tipo === "reasignar" && !destino)
    return { error: "Elige a quién pasarle la cuenta." };
  if (motivo.length < 3) return { error: "Cuéntale al manager el motivo." };

  const supabase = await crearClienteServidor();
  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("empresa_id")
    .eq("id", cuentaId)
    .maybeSingle();
  if (!cuenta) return { error: "No encontramos la cuenta." };

  const { error } = await supabase.from("solicitudes").insert({
    empresa_id: cuenta.empresa_id,
    cuenta_id: cuentaId,
    tipo,
    solicitante_id: perfil.id,
    kam_destino_id: tipo === "reasignar" ? destino : null,
    motivo,
  });
  if (error) {
    if (error.code === "23505")
      return { error: "Ya hay una solicitud pendiente para esta cuenta." };
    if (error.message.includes("row-level security"))
      return { error: "No puedes pedir cambios para esta cuenta." };
    return {
      error: "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelarSolicitud(id: string): Promise<Respuesta> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("solicitudes")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return { error: "No se pudo cancelar: quizá el manager ya la respondió." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** El manager (o el auditor) aprueba o rechaza. Al aprobar, la base de datos aplica el cambio. */
export async function resolverSolicitud(
  id: string,
  aprobar: boolean,
  respuesta: string,
): Promise<Respuesta> {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam")
    return { error: "Solo el manager puede resolver solicitudes." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("solicitudes")
    .update({
      estado: aprobar ? "aprobada" : "rechazada",
      respuesta: respuesta.trim() || null,
    })
    .eq("id", id)
    .eq("estado", "pendiente")
    .select("id");
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };
  if (!data?.length)
    return { error: "Esta solicitud ya se había resuelto o se canceló." };
  revalidatePath("/", "layout");
  return { ok: true };
}
