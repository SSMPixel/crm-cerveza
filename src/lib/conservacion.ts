// Plazos de conservación (ver avisoEquipo.ts): se aplican una vez al día.
// - Fotos: 12 meses desde la visita (se borran del almacenamiento).
// - Fotos huérfanas (visita que nunca se guardó): a los 2 días.
// - Actividad del equipo: 24 meses; registros técnicos de envío: 90 días.
import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { BUCKET_FOTOS } from "@/lib/fotos";
import { PLAZOS } from "@/lib/avisoEquipo";

const LOTE = 200;

export async function aplicarConservacion() {
  const admin = crearClienteAdmin();
  const resumen: Record<string, unknown> = {};

  // 1) Fotos vencidas.
  const limite = new Date();
  limite.setMonth(limite.getMonth() - PLAZOS.fotosMeses);
  const { data: conFotos, error: e1 } = await admin
    .from("visitas")
    .select("id, fotos")
    .lt("fecha_hora", limite.toISOString())
    .filter("fotos", "neq", "{}")
    .limit(LOTE);
  if (e1) resumen.errorFotos = e1.message;
  let fotosBorradas = 0;
  if (conFotos?.length) {
    const rutas = conFotos.flatMap((v) => v.fotos as string[]);
    const { error } = await admin.storage.from(BUCKET_FOTOS).remove(rutas);
    if (error) resumen.errorFotos = error.message;
    else {
      await admin
        .from("visitas")
        .update({ fotos: [] })
        .in(
          "id",
          conFotos.map((v) => v.id),
        );
      fotosBorradas = rutas.length;
    }
  }
  resumen.fotosVencidas = fotosBorradas;

  // 2) Fotos huérfanas.
  const { data: huerfanas } = await admin.rpc("fotos_huerfanas", {
    p_limite: LOTE,
  });
  const rutasHuerfanas = (huerfanas ?? []) as string[];
  if (rutasHuerfanas.length) {
    const { error } = await admin.storage
      .from(BUCKET_FOTOS)
      .remove(rutasHuerfanas);
    if (error) resumen.errorHuerfanas = error.message;
  }
  resumen.fotosHuerfanas = rutasHuerfanas.length;

  // 3) Registros vencidos en la base de datos.
  const { data, error } = await admin.rpc("aplicar_conservacion");
  if (error) resumen.errorRegistros = error.message;
  else resumen.registros = data;

  return resumen;
}
