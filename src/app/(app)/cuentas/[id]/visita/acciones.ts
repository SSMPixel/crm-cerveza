"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoVisita = { error?: string };

// Traducción de los errores que manda la base de datos a lenguaje del KAM.
const mensajes: Record<string, string> = {
  FUERA_DE_RANGO_SIN_MOTIVO:
    "Estás lejos de la cuenta o sin ubicación. Elige el motivo para poder guardar.",
  FALTA_PROXIMA_ACCION: "Escribe la próxima acción y su fecha.",
  FECHA_EN_PASADO: "La próxima acción no puede tener fecha pasada.",
  CUENTA_NO_ENCONTRADA: "No encontramos esta cuenta.",
};

export async function registrarVisita(
  cuentaId: string,
  _estado: EstadoVisita,
  formData: FormData,
): Promise<EstadoVisita> {
  const texto = (k: string) => String(formData.get(k) ?? "").trim();
  const numero = (k: string) => {
    const v = texto(k).replace(/[$,\s]/g, "");
    return v === "" ? null : Number(v);
  };

  const monto = numero("monto");
  if (monto !== null && (Number.isNaN(monto) || monto <= 0)) {
    return { error: "El monto del pedido debe ser un número mayor a cero." };
  }

  const motivo =
    texto("motivo") === "Otro" ? texto("motivo_otro") : texto("motivo");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("registrar_visita", {
    p_cuenta_id: cuentaId,
    p_lat: numero("lat"),
    p_lng: numero("lng"),
    p_motivo: motivo || null,
    p_nota: texto("nota") || null,
    p_accion_descripcion: texto("accion"),
    p_accion_fecha: texto("accion_fecha") || null,
    p_cumplio_anterior: formData.get("cumplio") === "on",
    p_monto_pedido: monto,
    p_nueva_etapa: texto("etapa") || null,
  });

  if (error) {
    const clave = Object.keys(mensajes).find((k) => error.message.includes(k));
    if (clave) return { error: mensajes[clave] };
    if (error.message.includes("perdida")) {
      return {
        error: "Para dar una cuenta por perdida hay que pedirlo al manager.",
      };
    }
    return {
      error:
        "No se pudo guardar la visita. Revisa tu conexión e inténtalo de nuevo.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/cuentas/${cuentaId}?registrada=1`);
}
