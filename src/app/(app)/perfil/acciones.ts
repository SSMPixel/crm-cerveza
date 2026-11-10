"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function cambiarContrasena(formData: FormData) {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  if (nueva.length < 8) redirect("/perfil?error=corta");
  if (nueva !== confirmar) redirect("/perfil?error=distintas");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  redirect(error ? "/perfil?error=guardar" : "/perfil?ok=1");
}
