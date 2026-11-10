"use client";

import { useState, useTransition } from "react";
import { ligaWhatsApp } from "@/lib/contacto";
import type { EstadoAlta } from "@/app/(app)/equipo/acciones";

const estilo =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20";

// Contraseña temporal fácil de dictar (sin 0/O, 1/l).
function contrasenaTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const numeros = "23456789";
  const al = (s: string) =>
    s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  return `${al(letras).toUpperCase()}${Array.from({ length: 5 }, () => al(letras)).join("")}-${Array.from({ length: 4 }, () => al(numeros)).join("")}`;
}

export function FormAltaPersona({
  accion,
  puedeManager,
  textoBoton = "Dar de alta",
}: {
  accion: (fd: FormData) => Promise<EstadoAlta>;
  puedeManager: boolean;
  textoBoton?: string;
}) {
  const [estado, setEstado] = useState<EstadoAlta>({});
  const [enviando, iniciar] = useTransition();
  const [contrasena, setContrasena] = useState("");
  const [copiado, setCopiado] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    iniciar(async () => {
      try {
        const r = await accion(fd);
        setEstado(r);
        if (r.ok) {
          form.reset();
          setContrasena("");
        }
      } catch {
        setEstado({ error: "No se pudo guardar: revisa tu conexión." });
      }
    });
  }

  if (estado.ok) {
    const o = estado.ok;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const mensaje = `Hola ${o.nombre}, ya tienes acceso a la app del equipo. Entra en ${url} con tu correo ${o.correo} y la contraseña ${o.contrasena}. Puedes cambiarla en "Mi perfil".`;
    const wa = ligaWhatsApp(o.telefono, mensaje);
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="font-medium text-green-900">
          Listo, {o.nombre} ya tiene acceso.
        </p>
        <p className="mt-1 text-sm text-green-900">
          Compártele sus datos de entrada:
        </p>
        <p className="mt-2 rounded-lg bg-white p-3 text-sm text-stone-800">
          {mensaje}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(mensaje);
              setCopiado(true);
            }}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium"
          >
            {copiado ? "¡Copiado!" : "Copiar mensaje"}
          </button>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium"
            >
              Mandar por WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setEstado({});
              setCopiado(false);
            }}
            className="rounded-lg px-3 py-2 text-sm text-stone-700 underline underline-offset-4"
          >
            Dar de alta a alguien más
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nombre</span>
          <input name="nombre" className={estilo} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Correo</span>
          <input
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="off"
            className={estilo}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Teléfono / WhatsApp</span>
          <input name="telefono" inputMode="tel" className={estilo} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contraseña temporal</span>
          <div className="flex gap-2">
            <input
              name="contrasena"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="off"
              className={estilo}
            />
            <button
              type="button"
              onClick={() => setContrasena(contrasenaTemporal())}
              className="mt-1 shrink-0 rounded-lg border border-stone-300 bg-white px-3 text-sm"
            >
              Generar
            </button>
          </div>
        </label>
        {puedeManager && (
          <label className="block">
            <span className="text-sm font-medium">Rol</span>
            <select name="rol" defaultValue="kam" className={estilo}>
              <option value="kam">KAM</option>
              <option value="manager">Manager</option>
            </select>
          </label>
        )}
      </div>
      {estado.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {estado.error}
        </p>
      )}
      <button
        disabled={enviando}
        className="rounded-lg bg-amber-800 px-4 py-2.5 font-medium text-white hover:bg-amber-900 disabled:opacity-60"
      >
        {enviando ? "Creando…" : textoBoton}
      </button>
    </form>
  );
}
