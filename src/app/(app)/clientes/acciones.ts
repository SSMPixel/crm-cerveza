"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_CLIENTE } from "@/lib/clienteActivo";
import { obtenerPerfil } from "@/lib/sesion";

export async function entrarCliente(empresaId: string) {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "auditor") redirect("/");
  (await cookies()).set(COOKIE_CLIENTE, empresaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function salirCliente() {
  (await cookies()).delete(COOKIE_CLIENTE);
  redirect("/clientes");
}
