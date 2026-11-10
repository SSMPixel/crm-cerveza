// Fotos de visita: se guardan en Supabase Storage (privado) y se muestran con
// ligas temporales que se generan en el servidor.
import { crearClienteServidor } from "@/lib/supabase/server";

export const BUCKET_FOTOS = "fotos-visitas";

/** Convierte rutas de fotos en ligas temporales (1 hora). */
export async function ligasFotos(
  rutas: string[],
): Promise<Record<string, string>> {
  const unicas = [...new Set(rutas.filter(Boolean))];
  if (unicas.length === 0) return {};
  const supabase = await crearClienteServidor();
  const { data } = await supabase.storage
    .from(BUCKET_FOTOS)
    .createSignedUrls(unicas, 3600);
  const mapa: Record<string, string> = {};
  for (const f of data ?? [])
    if (f.path && f.signedUrl) mapa[f.path] = f.signedUrl;
  return mapa;
}
