// KAMs activos de la empresa que se está viendo (para listas de selección).
import { crearClienteServidor } from "@/lib/supabase/server";

export async function kamsDeEmpresa(empresaId: string | null) {
  if (!empresaId) return [];
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre")
    .eq("empresa_id", empresaId)
    .eq("rol", "kam")
    .eq("activo", true)
    .order("nombre");
  return data ?? [];
}
