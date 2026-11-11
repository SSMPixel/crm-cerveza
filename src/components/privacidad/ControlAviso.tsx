import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { avisoPendiente } from "@/lib/avisoEquipo";
import { AvisoObligatorio } from "./AvisoObligatorio";

// Si hay un aviso del cliente que esta persona no ha visto, lo muestra encima de todo.
export async function ControlAviso() {
  const perfil = await obtenerPerfil();
  if (!perfil) return null;
  const supabase = await crearClienteServidor();
  const aviso = await avisoPendiente(supabase, perfil);
  if (!aviso) return null;
  return (
    <AvisoObligatorio
      avisoId={aviso.id}
      version={aviso.version}
      texto={aviso.texto}
      empresa={perfil.empresa ?? "tu empresa"}
    />
  );
}
