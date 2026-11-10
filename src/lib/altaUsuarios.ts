// Alta de usuarios (KAMs y managers). Crear un usuario de login requiere la
// llave secreta, así que esto solo corre en el servidor y después de revisar
// quién lo pide.
import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export type NuevaPersona = {
  empresaId: string;
  nombre: string;
  correo: string;
  contrasena: string;
  rol: "kam" | "manager";
  telefono: string | null;
};

export async function crearUsuario(
  p: NuevaPersona,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let admin;
  try {
    admin = crearClienteAdmin();
  } catch {
    return {
      ok: false,
      error: "Falta configurar SUPABASE_SECRET_KEY en Vercel.",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: p.correo,
    password: p.contrasena,
    email_confirm: true,
    user_metadata: { nombre: p.nombre },
  });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    if (/already|registered|exists/i.test(msg))
      return { ok: false, error: "Ya existe un usuario con ese correo." };
    if (/password/i.test(msg))
      return {
        ok: false,
        error: "La contraseña es muy débil: usa al menos 8 caracteres.",
      };
    return { ok: false, error: "No se pudo crear el usuario." };
  }

  const { error: errPerfil } = await admin.from("perfiles").insert({
    id: data.user.id,
    empresa_id: p.empresaId,
    nombre: p.nombre,
    correo: p.correo,
    rol: p.rol,
    telefono: p.telefono,
  });
  if (errPerfil) {
    await admin.auth.admin.deleteUser(data.user.id); // no dejar usuarios a medias
    return { ok: false, error: "No se pudo crear el perfil." };
  }
  return { ok: true };
}

export function validarPersona(
  nombre: string,
  correo: string,
  contrasena: string,
) {
  if (!nombre) return "Escribe el nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return "El correo no parece válido.";
  if (contrasena.length < 8)
    return "La contraseña debe tener al menos 8 caracteres.";
  return null;
}
