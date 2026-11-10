// Descargas en formato de hoja de cálculo (.xlsx): Excel, Google Sheets y Numbers
// las abren igual, con acentos, montos como número y títulos fijos.
import ExcelJS from "exceljs";
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

export async function respuestaHoja(
  nombre: string,
  encabezados: string[],
  filas: unknown[][],
  opciones: { montos?: string[] } = {},
) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "CRM Cervecero";
  const hoja = libro.addWorksheet(nombre.replace(/-.*$/, ""), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  hoja.addRow(encabezados);
  for (const f of filas)
    hoja.addRow(f.map((v) => (v === null || v === undefined ? "" : v)));

  const titulos = hoja.getRow(1);
  titulos.font = { bold: true, color: { argb: "FFFFFFFF" } };
  titulos.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF92400E" },
  };
  hoja.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: encabezados.length },
  };

  // Ancho según el contenido (con tope) y formato de pesos en las columnas de montos.
  encabezados.forEach((t, i) => {
    const col = hoja.getColumn(i + 1);
    const largo = Math.max(
      t.length,
      ...filas.slice(0, 300).map((f) => String(f[i] ?? "").length),
    );
    col.width = Math.min(Math.max(largo + 2, 8), 50);
    if (opciones.montos?.includes(t)) col.numFmt = '"$"#,##0';
  });

  const contenido = await libro.xlsx.writeBuffer();
  return new Response(contenido as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}.xlsx"`,
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
