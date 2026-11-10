// Archivos CSV que Excel abre bien en español (acentos incluidos).
import { cookies } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/server";
import { COOKIE_CLIENTE } from "@/lib/clienteActivo";

function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  const t = String(v);
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function respuestaCsv(
  nombre: string,
  encabezados: string[],
  filas: unknown[][],
) {
  const contenido = [encabezados, ...filas]
    .map((f) => f.map(celda).join(","))
    .join("\r\n");
  // La marca BOM al inicio le avisa a Excel que el archivo está en UTF-8.
  return new Response("﻿" + contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Usuario actual y la empresa que está viendo (para el auditor, su cliente activo). */
export async function contextoExportar() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, rol, empresa_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil) return null;
  let empresaId: string | null = perfil.empresa_id;
  if (perfil.rol === "auditor") {
    const valor = (await cookies()).get(COOKIE_CLIENTE)?.value ?? null;
    empresaId = valor && /^[0-9a-f-]{36}$/i.test(valor) ? valor : null;
  }
  return { supabase, perfil, empresaId };
}
