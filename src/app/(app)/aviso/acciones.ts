"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { marcadoresPendientes } from "@/lib/identidad";

export type Respuesta = { ok: true } | { error: string };

/** El KAM o manager deja constancia de que tuvo el aviso a la vista. */
export async function registrarConstancia(avisoId: string): Promise<Respuesta> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("constancias_aviso")
    .upsert(
      { perfil_id: perfil.id, aviso_id: avisoId },
      { onConflict: "perfil_id,aviso_id", ignoreDuplicates: true },
    );
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Publica una versión nueva del aviso del equipo (manager o auditor). */
export async function publicarAviso(texto: string): Promise<Respuesta> {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam")
    return { error: "Solo el manager puede publicar el aviso." };
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) return { error: "Primero elige un cliente." };

  const limpio = texto.replace(/\r\n/g, "\n").trim();
  const pendientes = marcadoresPendientes(limpio);
  if (pendientes.length)
    return {
      error: `Faltan datos por completar: ${pendientes.slice(0, 4).join(", ")}${pendientes.length > 4 ? "…" : ""}`,
    };
  if (limpio.length < 600)
    return {
      error:
        "El aviso parece incompleto. Revisa que tenga todas sus secciones.",
    };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("avisos_privacidad")
    .insert({ empresa_id: empresaId, texto: limpio, version: 0 });
  if (error) return { error: "No se pudo publicar. Inténtalo de nuevo." };
  revalidatePath("/", "layout");
  return { ok: true };
}
