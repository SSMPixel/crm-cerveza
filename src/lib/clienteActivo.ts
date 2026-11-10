// El auditor puede "entrar" a un cliente: desde ese momento el inicio, el mapa
// y las cuentas muestran solo lo de esa empresa. Se recuerda en una cookie.
// Para managers y KAMs no aplica: la base de datos ya les muestra solo su empresa.
import { cookies } from "next/headers";
import type { Perfil } from "./sesion";

export const COOKIE_CLIENTE = "cliente_activo";

/** Empresa que se está viendo: la del usuario, o la que eligió el auditor (o null). */
export async function empresaEnVista(perfil: Perfil): Promise<string | null> {
  if (perfil.rol !== "auditor") return perfil.empresa_id;
  const valor = (await cookies()).get(COOKIE_CLIENTE)?.value;
  return valor && /^[0-9a-f-]{36}$/i.test(valor) ? valor : null;
}
