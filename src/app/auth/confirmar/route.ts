// Llega aquí el enlace del correo de recuperación. Se valida el código de un
// solo uso, se abre la sesión y se manda a poner la contraseña nueva.
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const tokenHash = p.get("token_hash");
  const tipo = p.get("type");

  if (tokenHash && tipo === "recovery") {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    if (!error)
      return NextResponse.redirect(new URL("/nueva-contrasena", request.url));
  }
  return NextResponse.redirect(
    new URL("/login/recuperar?error=enlace", request.url),
  );
}
