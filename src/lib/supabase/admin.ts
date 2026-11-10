// Cliente con la llave SECRETA de Supabase: salta las reglas de seguridad.
// Solo lo usa el envío automático del resumen, que corre sin usuario.
// Nunca se importa desde el navegador ("server-only" lo impide).
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function crearClienteAdmin() {
  const llave = process.env.SUPABASE_SECRET_KEY;
  if (!llave)
    throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, llave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
