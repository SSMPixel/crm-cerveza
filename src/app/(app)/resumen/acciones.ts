"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { datosResumen } from "@/lib/resumen";
import { asuntoResumen, htmlResumen } from "@/lib/correoResumen";
import { enviarCorreo } from "@/lib/enviarCorreo";

async function empresaPermitida() {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam") redirect("/");
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) redirect("/clientes");
  return { perfil, empresaId };
}

/** Manda el resumen de esta semana al correo de quien lo pide. */
export async function enviarmePrueba() {
  const { empresaId } = await empresaPermitida();
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const datos = await datosResumen(supabase, empresaId);
  if (!datos || !user?.email) redirect("/resumen?error=sin-datos");

  const h = await headers();
  const url = `https://${h.get("host")}`;
  const envio = await enviarCorreo({
    para: [user.email],
    asunto: `[Prueba] ${asuntoResumen(datos)}`,
    html: htmlResumen(datos, url),
  });
  redirect(
    envio.ok
      ? "/resumen?enviado=1"
      : `/resumen?error=${encodeURIComponent(envio.error)}`,
  );
}

/** Cambia el día y el turno en que la empresa recibe su resumen. */
export async function guardarHorario(formData: FormData) {
  const { empresaId } = await empresaPermitida();
  const dia = Number(formData.get("dia"));
  const turno = formData.get("turno") === "tarde" ? "16:00" : "07:00";
  if (!(dia >= 1 && dia <= 7)) redirect("/resumen");

  const supabase = await crearClienteServidor();
  await supabase
    .from("empresas")
    .update({ resumen_dia: dia, resumen_hora: turno })
    .eq("id", empresaId);
  revalidatePath("/resumen");
  redirect("/resumen?guardado=1");
}
