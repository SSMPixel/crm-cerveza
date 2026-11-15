"use server";

import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoRecuperar = { enviado?: boolean; error?: string };

export async function pedirRecuperacion(
  _estado: EstadoRecuperar,
  formData: FormData,
): Promise<EstadoRecuperar> {
  const correo = String(formData.get("correo") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return { error: "Escribe un correo válido." };

  const supabase = await crearClienteServidor();
  // El enlace del correo lo arma la plantilla de Supabase (ver docs/correo-recuperacion.md).
  const { error } = await supabase.auth.resetPasswordForEmail(correo);

  if (error?.status === 429 || error?.code === "over_email_send_rate_limit")
    return {
      error:
        "Ya pediste un enlace hace muy poco. Espera unos minutos y revisa tu correo, también en spam.",
    };
  if (error) console.error("recuperar contraseña", error.code, error.message);

  // Siempre la misma respuesta: así nadie puede averiguar qué correos están registrados.
  return { enviado: true };
}
