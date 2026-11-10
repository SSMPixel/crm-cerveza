"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./acciones";
import { CampoContrasena } from "@/components/CampoContrasena";

export default function PaginaLogin() {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(
    iniciarSesion,
    {},
  );

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-stone-900">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Entra con el correo que te dio tu manager.
        </p>

        <form action={accion} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-800">Correo</span>
            <input
              name="correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-800">
              Contraseña
            </span>
            <CampoContrasena
              name="contrasena"
              autoComplete="current-password"
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </label>

          {estado.error && (
            <p role="alert" className="text-sm text-red-700">
              {estado.error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-amber-800 px-4 py-3 text-base font-medium text-white hover:bg-amber-900 disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
