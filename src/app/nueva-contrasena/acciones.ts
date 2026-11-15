"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoNueva = { error?: string };

export async function guardarNuevaContrasena(
  _estado: EstadoNueva,
  formData: FormData,
): Promise<EstadoNueva> {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  if (nueva.length < 8)
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (nueva !== confirmar)
    return { error: "Las dos contraseñas no coinciden." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error?.code === "same_password")
    return { error: "Usa una contraseña distinta a la anterior." };
  if (error?.code === "weak_password")
    return { error: "Esa contraseña es muy fácil de adivinar. Prueba otra." };
  if (error) return { error: "No se pudo guardar. Pide un enlace nuevo." };

  redirect("/");
}
