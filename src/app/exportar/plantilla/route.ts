// Descarga de la plantilla para importar la cartera.
import { contextoExportar } from "@/lib/csv";
import { crearPlantilla } from "@/lib/plantillaCartera";

export async function GET() {
  const ctx = await contextoExportar();
  if (!ctx || ctx.perfil.rol === "kam" || !ctx.empresaId)
    return new Response("Sin permiso", { status: 403 });

  const { data: kams } = await ctx.supabase
    .from("perfiles")
    .select("nombre")
    .eq("empresa_id", ctx.empresaId)
    .eq("rol", "kam")
    .eq("activo", true)
    .order("nombre");

  const contenido = await crearPlantilla(kams ?? []);
  return new Response(contenido as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-cartera.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
