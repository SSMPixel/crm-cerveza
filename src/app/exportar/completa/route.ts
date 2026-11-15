// Exportación de salida de un cliente. Dos partes, porque las fotos no caben
// en una sola respuesta del servidor:
//   ?parte=hoja   → el libro .xlsx con todas las pestañas
//   ?parte=fotos  → la lista de fotos con ligas temporales; el navegador las
//                   descarga y arma el .zip.
import { contextoExportar } from "@/lib/csv";
import { armarExportacion, ligasExportacion } from "@/lib/exportacionCompleta";

export const maxDuration = 60;

export async function GET(request: Request) {
  const ctx = await contextoExportar();
  if (!ctx) return new Response("Sin sesión", { status: 401 });
  const { supabase, perfil, empresaId } = ctx;
  if (perfil.rol === "kam" || !empresaId)
    return new Response("Sin permiso", { status: 403 });

  const parte = new URL(request.url).searchParams.get("parte");
  try {
    const { libro, fotos, nombreBase } = await armarExportacion(
      supabase,
      empresaId,
    );
    if (parte === "fotos") {
      const ligas = await ligasExportacion(supabase, fotos);
      return Response.json(
        { nombreBase, fotos: ligas },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const contenido = await libro.xlsx.writeBuffer();
    return new Response(contenido as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreBase}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("exportación completa", e);
    return new Response("No se pudo exportar", { status: 500 });
  }
}
