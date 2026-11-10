"use server";

import { revalidatePath } from "next/cache";
import { obtenerPerfil } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearUsuario, validarPersona } from "@/lib/altaUsuarios";
import type { EstadoAlta } from "../../equipo/acciones";

/** Solo el auditor: crea la empresa y a su manager en un paso. */
export async function crearCliente(formData: FormData): Promise<EstadoAlta> {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "auditor")
    return { error: "Solo el auditor puede dar de alta clientes." };

  const t = (k: string) => String(formData.get(k) ?? "").trim();
  const empresa = t("empresa");
  const nombre = t("nombre");
  const correo = t("correo").toLowerCase();
  const contrasena = t("contrasena");
  const telefono = t("telefono") || null;
  if (!empresa) return { error: "Escribe el nombre del cliente." };
  const invalido = validarPersona(nombre, correo, contrasena);
  if (invalido) return { error: `Manager: ${invalido}` };

  let admin;
  try {
    admin = crearClienteAdmin();
  } catch {
    return { error: "Falta configurar SUPABASE_SECRET_KEY en Vercel." };
  }
  const { data: nueva, error } = await admin
    .from("empresas")
    .insert({ nombre: empresa })
    .select("id")
    .single();
  if (error || !nueva) return { error: "No se pudo crear el cliente." };

  const r = await crearUsuario({
    empresaId: nueva.id,
    nombre,
    correo,
    contrasena,
    rol: "manager",
    telefono,
  });
  if (!r.ok) {
    await admin.from("empresas").delete().eq("id", nueva.id); // no dejar empresas sin manager
    return { error: r.error };
  }
  revalidatePath("/clientes");
  return { ok: { nombre, correo, contrasena, telefono } };
}
