// Convierte un archivo de Excel (.xlsx) o CSV en una tabla de textos.
import "server-only";
import ExcelJS from "exceljs";
import JSZip from "jszip";

type Celda = ExcelJS.Cell;

function texto(c: Celda): string {
  const v = c.value;
  if (v === null || v === undefined) return "";
  // Números tal cual: el formato de la celda podría recortar decimales (coordenadas).
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && "result" in v && typeof v.result === "number")
    return String(v.result);
  try {
    return c.text ?? "";
  } catch {
    return "";
  }
}

export async function leerExcel(
  archivo: File,
): Promise<string[][] | { error: string }> {
  const nombre = archivo.name.toLowerCase();
  const libro = new ExcelJS.Workbook();
  try {
    if (nombre.endsWith(".csv")) {
      const contenido = (await archivo.text()).replace(/^﻿/, "");
      return leerCsv(contenido);
    }
    if (nombre.endsWith(".xls"))
      return {
        error:
          'Ese archivo es de un Excel antiguo (.xls). Ábrelo en Excel y guárdalo como "Libro de Excel (.xlsx)".',
      };
    const datos = await archivo.arrayBuffer();
    try {
      await libro.xlsx.load(datos);
    } catch {
      // Algunos programas guardan comentarios o imágenes de una forma que
      // exceljs no entiende. No nos sirven: los quitamos y reintentamos.
      await libro.xlsx.load(await sinAdornos(datos));
    }
  } catch {
    return {
      error: "No pudimos abrir el archivo. ¿Es un Excel (.xlsx) o CSV?",
    };
  }

  // La primera hoja que tenga datos (la plantilla trae una de instrucciones al final).
  for (const hoja of libro.worksheets) {
    if (hoja.state !== "visible" || hoja.actualRowCount === 0) continue;
    const filas: string[][] = [];
    hoja.eachRow({ includeEmpty: true }, (fila, n) => {
      const valores: string[] = [];
      for (let c = 1; c <= hoja.columnCount; c++)
        valores.push(texto(fila.getCell(c)));
      filas[n - 1] = valores;
    });
    return Array.from(filas, (f) => f ?? []);
  }
  return { error: "El archivo está vacío." };
}

async function sinAdornos(datos: ArrayBuffer) {
  const zip = await JSZip.loadAsync(datos);
  for (const ruta of Object.keys(zip.files)) {
    if (/^xl\/worksheets\/_rels\/.*\.rels$/.test(ruta)) {
      const xml = await zip.file(ruta)!.async("string");
      zip.file(
        ruta,
        xml.replace(
          /<Relationship\b[^>]*Type="[^"]*\/(comments|vmlDrawing|drawing)"[^>]*\/>/g,
          "",
        ),
      );
    } else if (/^xl\/worksheets\/[^/]+\.xml$/.test(ruta)) {
      const xml = await zip.file(ruta)!.async("string");
      zip.file(ruta, xml.replace(/<(legacyDrawing|drawing)\b[^>]*\/>/g, ""));
    }
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

// CSV sencillo: detecta coma o punto y coma, respeta comillas.
function leerCsv(contenido: string): string[][] {
  const primera = contenido.split(/\r?\n/, 1)[0];
  const sep =
    (primera.match(/;/g) ?? []).length > (primera.match(/,/g) ?? []).length
      ? ";"
      : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < contenido.length; i++) {
    const ch = contenido[i];
    if (comillas) {
      if (ch === '"' && contenido[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) {
      fila.push(celda);
      celda = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && contenido[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += ch;
  }
  if (celda || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}
