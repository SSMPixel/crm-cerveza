"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { pedirRecuperacion, type EstadoRecuperar } from "./acciones";

const campo =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20";

export default function PaginaRecuperar() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-stone-900">
          Recuperar contraseña
        </h1>
        <Suspense>
          <AvisoEnlace />
        </Suspense>
        <Formulario />
        <p className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-amber-800 underline underline-offset-2"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

function AvisoEnlace() {
  const error = useSearchParams().get("error");
  if (error !== "enlace") return null;
  return (
    <p
      role="alert"
      className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800"
    >
      Ese enlace ya se usó o venció. Pide uno nuevo aquí abajo.
    </p>
  );
}

function Formulario() {
  const [estado, accion, enviando] = useActionState<EstadoRecuperar, FormData>(
    pedirRecuperacion,
    {},
  );

  if (estado.enviado)
    return (
      <div
        role="status"
        className="mt-6 rounded-xl border border-stone-200 bg-white p-4"
      >
        <p className="font-medium text-stone-900">Revisa tu correo</p>
        <p className="mt-1 text-sm text-stone-600">
          Si ese correo tiene cuenta en Bluepace, te llegará un enlace para
          poner una contraseña nueva. Vence en una hora. Si no lo ves en unos
          minutos, busca en spam.
        </p>
      </div>
    );

  return (
    <>
      <p className="mt-1 text-sm text-stone-600">
        Escribe el correo con el que entras y te mandamos un enlace para poner
        una contraseña nueva.
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
            className={campo}
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
          {enviando ? "Enviando…" : "Mandar enlace"}
        </button>
      </form>
    </>
  );
}
