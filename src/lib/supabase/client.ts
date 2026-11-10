// Cliente de Supabase para usar en el navegador (por ejemplo, para subir fotos).
// Usa la misma sesión que el servidor, guardada en las cookies.
import { createBrowserClient } from "@supabase/ssr";

export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
