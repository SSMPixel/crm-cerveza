// Quién está usando la app. Se consulta una sola vez por petición.
import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Perfil = {
  id: string;
  nombre: string;
  rol: "kam" | "manager" | "auditor";
  empresa_id: string | null;
  empresa: string | null;
};

export const obtenerPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, empresa_id, empresas(nombre)")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;
  const empresa = data.empresas as unknown as { nombre: string } | null;
  return {
    id: data.id,
    nombre: data.nombre,
    rol: data.rol,
    empresa_id: data.empresa_id,
    empresa: empresa?.nombre ?? null,
  };
});
