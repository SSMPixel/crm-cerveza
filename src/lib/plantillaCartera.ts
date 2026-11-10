// Plantilla de Excel para importar la cartera. Trae listas desplegables
// (tipo, categoría, etapa y los KAMs reales del equipo) y una hoja de instrucciones.
import ExcelJS from "exceljs";
import { nombreEtapa, tiposLugar, capitalizar } from "@/lib/formato";
const columnas = [
  { titulo: "Nombre de la cuenta", ancho: 30 },
  {
    titulo: "Dirección",
    ancho: 38,
  },
  { titulo: "Colonia o zona", ancho: 20 },
  {
    titulo: "Ciudad",
    ancho: 18,
  },
  { titulo: "CP", ancho: 9 },
  { titulo: "Tipo de lugar", ancho: 16 },
  { titulo: "Categoría", ancho: 11 },
  { titulo: "Etapa", ancho: 16 },
  { titulo: "KAM", ancho: 22 },
  { titulo: "Contacto", ancho: 22 },
  { titulo: "Teléfono", ancho: 15 },
  { titulo: "Correo", ancho: 26 },
  { titulo: "Objetivo mensual (MXN)", ancho: 14 },
];

const FILAS = 1000;
type Validable = {
  dataValidations: { add(rango: string, regla: ExcelJS.DataValidation): void };
};
const ambar = "FF92400E";

export async function crearPlantilla(kams: { nombre: string }[]) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "CRM Cervecero";

  // ---------- Hoja de captura ----------
  const hoja = libro.addWorksheet("Cartera", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  hoja.columns = columnas.map((c) => ({ header: c.titulo, width: c.ancho }));
  const encabezado = hoja.getRow(1);
  encabezado.height = 22;
  encabezado.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: ambar },
    };
    celda.alignment = { vertical: "middle" };
  });
  hoja.getColumn(11).numFmt = "@"; // teléfonos como texto
  hoja.getColumn(5).numFmt = "@"; // CP como texto (conserva el 0 inicial)
  hoja.getColumn(13).numFmt = '"$"#,##0';

  const lista = (col: string, valores: string[]) => {
    const formula = `"${valores.join(",")}"`;
    if (valores.length === 0 || formula.length > 255) return;
    // exceljs sí lo soporta, pero no viene en sus tipos.
    (hoja as unknown as Validable).dataValidations.add(
      `${col}2:${col}${FILAS + 1}`,
      {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Valor fuera de la lista",
        error: "Te recomendamos elegir de la lista.",
      },
    );
  };
  lista(
    "F",
    tiposLugar.map((t) => capitalizar(t) ?? t),
  );
  lista("G", ["A", "B", "C"]);
  lista("H", Object.values(nombreEtapa));
  lista(
    "I",
    kams.map((k) => k.nombre.replace(/,/g, " ")),
  );

  // ---------- Instrucciones ----------
  const ayuda = libro.addWorksheet("Instrucciones");
  ayuda.getColumn(1).width = 26;
  ayuda.getColumn(2).width = 80;
  const renglones: [string, string][] = [
    ["Cómo llenar la cartera", ""],
    ["", ""],
    [
      "1.",
      'Una cuenta por renglón en la hoja "Cartera". No cambies los títulos.',
    ],
    [
      "2.",
      "Solo el nombre es obligatorio. Entre más datos, mejor funciona la app.",
    ],
    [
      "3.",
      "Con la dirección completa (calle, número, colonia) la ubicamos en el mapa.",
    ],
    ["", "Si no la encontramos, se fija sola en la primera visita del KAM."],
    ["", "Si no pones ciudad, la buscamos en Ciudad de México."],
    ["4.", "El KAM debe estar dado de alta en la app (Equipo y ajustes)."],
    [
      "5.",
      "Si ya tienes tu cartera en otro Excel, también puedes subirlo tal cual:",
    ],
    [
      "",
      'reconocemos títulos como "Cliente", "Vendedor", "Colonia", "Giro", "Teléfono".',
    ],
    ["", ""],
    ["Valores aceptados", ""],
    ["Tipo de lugar", tiposLugar.map((t) => capitalizar(t)).join(", ")],
    ["Categoría", "A (las más importantes), B o C. Vacía = C."],
    [
      "Etapa",
      `${Object.values(nombreEtapa).join(", ")}. Vacía = la que elijas al importar.`,
    ],
    [
      "KAM",
      kams.map((k) => k.nombre).join(", ") || "Aún no hay KAMs dados de alta.",
    ],
    ["", ""],
    ["Ejemplo", ""],
    ["Nombre de la cuenta", "Bar La Chingonería"],
    ["Dirección", "Av. Álvaro Obregón 120"],
    ["Colonia o zona", "Roma Norte"],
    ["Categoría", "A"],
    ["Etapa", "Cliente activo"],
    ["Objetivo mensual (MXN)", "15000"],
  ];
  renglones.forEach((r) => ayuda.addRow(r));
  for (const n of [1, 12, 18])
    ayuda.getCell(`A${n}`).font = { bold: true, size: n === 1 ? 14 : 12 };
  for (let n = 13; n <= 16; n++) ayuda.getCell(`A${n}`).font = { bold: true };

  return libro.xlsx.writeBuffer();
}
