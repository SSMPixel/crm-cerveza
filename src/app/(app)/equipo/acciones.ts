"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { crearUsuario, validarPersona } from "@/lib/altaUsuarios";

async function permiso() {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam") redirect("/");
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) redirect("/clientes");
  return { perfil, empresaId };
}

const entero = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export async function guardarAjustes(formData: FormData) {
  const { empresaId } = await permiso();
  const cambios = {
    meta_visitas_dia: entero(formData.get("meta"), 1, 30),
    frecuencia_a_dias: entero(formData.get("frec_a"), 1, 90),
    frecuencia_b_dias: entero(formData.get("frec_b"), 1, 120),
    frecuencia_c_dias: entero(formData.get("frec_c"), 1, 180),
    radio_checkin_m: entero(formData.get("radio"), 50, 2000),
  };
  if (Object.values(cambios).some((v) => v === null))
    redirect("/equipo?error=valores");
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("empresas")
    .update(cambios)
    .eq("id", empresaId);
  revalidatePath("/", "layout");
  redirect(error ? "/equipo?error=guardar" : "/equipo?ok=ajustes");
}

export async function guardarPersona(id: string, formData: FormData) {
  await permiso();
  const t = (k: string) => String(formData.get(k) ?? "").trim();
  const meta = t("meta");
  const cambios: Record<string, unknown> = {
    nombre: t("nombre"),
    telefono: t("telefono") || null,
    activo: formData.get("activo") === "on",
  };
  if (formData.has("meta"))
    cambios.meta_visitas_dia = meta ? entero(meta, 1, 30) : null;
  if (!cambios.nombre) redirect("/equipo?error=valores");
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("perfiles")
    .update(cambios)
    .eq("id", id);
  revalidatePath("/", "layout");
  redirect(error ? "/equipo?error=guardar" : "/equipo?ok=persona");
}

export type EstadoAlta = {
  error?: string;
  ok?: {
    nombre: string;
    correo: string;
    contrasena: string;
    telefono: string | null;
  };
};

export async function agregarPersona(formData: FormData): Promise<EstadoAlta> {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam") return { error: "No tienes permiso." };
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) return { error: "Primero elige un cliente." };

  const t = (k: string) => String(formData.get(k) ?? "").trim();
  const nombre = t("nombre");
  const correo = t("correo").toLowerCase();
  const contrasena = t("contrasena");
  const telefono = t("telefono") || null;
  // Un manager solo da de alta KAMs; el auditor puede dar de alta managers.
  const rol =
    perfil.rol === "auditor" && t("rol") === "manager" ? "manager" : "kam";

  const invalido = validarPersona(nombre, correo, contrasena);
  if (invalido) return { error: invalido };

  const r = await crearUsuario({
    empresaId,
    nombre,
    correo,
    contrasena,
    rol,
    telefono,
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/", "layout");
  return { ok: { nombre, correo, contrasena, telefono } };
}
