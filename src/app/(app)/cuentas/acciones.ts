"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { geocodificar } from "@/lib/geocodificar";
import { tiposLugar } from "@/lib/formato";

export type EstadoCuenta = { error?: string; id?: string };

const etapasAlta = [
  "prospecto",
  "contactado",
  "degustacion",
  "negociacion",
  "primer_pedido",
  "activo",
];

/** Crea (id = null) o edita una cuenta. Las reglas de la base de datos deciden qué puede cambiar cada rol. */
export async function guardarCuenta(
  id: string | null,
  formData: FormData,
): Promise<EstadoCuenta> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { error: "Tu sesión expiró. Vuelve a entrar." };
  const esKam = perfil.rol === "kam";
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) return { error: "Primero elige un cliente." };

  const t = (k: string) => String(formData.get(k) ?? "").trim();
  const nombre = t("nombre");
  if (!nombre) return { error: "Escribe el nombre de la cuenta." };
  const tipo = t("tipo_lugar");
  const correo = t("contacto_correo");
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { error: "El correo del contacto no parece válido." };
  }

  const datos: Record<string, unknown> = {
    nombre,
    tipo_lugar: (tiposLugar as readonly string[]).includes(tipo) ? tipo : null,
    zona: t("zona") || null,
    direccion: t("direccion") || null,
    contacto_nombre: t("contacto_nombre") || null,
    contacto_telefono: t("contacto_telefono") || null,
    contacto_correo: correo || null,
  };

  // Lo que solo decide el manager (o el auditor).
  if (!esKam) {
    const cat = t("categoria");
    if (["A", "B", "C"].includes(cat)) datos.categoria = cat;
    const obj = t("objetivo").replace(/[$,\s]/g, "");
    if (obj && (Number.isNaN(Number(obj)) || Number(obj) <= 0)) {
      return { error: "El objetivo mensual debe ser un número mayor a cero." };
    }
    datos.objetivo_mensual_mxn = obj ? Number(obj) : null;
    if (t("kam_id")) datos.kam_id = t("kam_id");
  }

  const supabase = await crearClienteServidor();

  // Ubicación: se busca si la cuenta es nueva o si cambió la dirección.
  let buscarUbicacion = !!datos.direccion;
  if (id && datos.direccion) {
    const { data: antes } = await supabase
      .from("cuentas")
      .select("direccion, lat")
      .eq("id", id)
      .maybeSingle();
    buscarUbicacion =
      antes?.direccion !== datos.direccion || antes?.lat === null;
  }
  if (buscarUbicacion) {
    const punto = await geocodificar(
      `${datos.direccion}${datos.zona ? `, ${datos.zona}` : ""}, Ciudad de México`,
    );
    if (punto) Object.assign(datos, punto);
  }

  if (id) {
    const { error } = await supabase.from("cuentas").update(datos).eq("id", id);
    if (error) return { error: traducir(error.message) };
    revalidatePath("/", "layout");
    return { id };
  }

  const etapa = t("etapa");
  const { data, error } = await supabase
    .from("cuentas")
    .insert({
      ...datos,
      empresa_id: empresaId,
      kam_id: esKam ? perfil.id : (datos.kam_id ?? null),
      etapa: etapasAlta.includes(etapa) ? etapa : "prospecto",
    })
    .select("id")
    .single();
  if (error || !data) return { error: traducir(error?.message ?? "") };
  revalidatePath("/", "layout");
  return { id: data.id };
}

function traducir(m: string) {
  if (m.includes("SOLO_MANAGER_CATEGORIA"))
    return "Solo el manager puede cambiar la categoría.";
  if (m.includes("SOLO_MANAGER_OBJETIVO"))
    return "Solo el manager puede cambiar el objetivo.";
  if (m.includes("reasignar"))
    return "Solo el manager puede reasignar la cuenta.";
  if (m.includes("row-level security"))
    return "No tienes permiso para hacer este cambio.";
  return "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
}
