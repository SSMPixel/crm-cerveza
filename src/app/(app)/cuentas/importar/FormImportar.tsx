"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { nombreEtapa } from "@/lib/formato";
import type {
  Campo,
  FilaAnalizada,
  ResultadoAnalisis,
} from "@/lib/importarCartera";
import {
  importarCartera,
  revisarCartera,
  type ResultadoImportacion,
} from "./acciones";

const nombreCampo: Record<Campo, string> = {
  nombre: "Nombre",
  direccion: "Dirección",
  zona: "Zona",
  ciudad: "Ciudad",
  cp: "CP",
  tipo_lugar: "Tipo",
  categoria: "Categoría",
  etapa: "Etapa",
  kam: "KAM",
  contacto_nombre: "Contacto",
  contacto_telefono: "Teléfono",
  contacto_correo: "Correo",
  objetivo: "Objetivo",
  coordenadas: "Coordenadas",
  lat: "Latitud",
  lng: "Longitud",
};

const sinAcentos = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const estiloSelect =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base focus:border-amber-700 focus:outline-none";

export function FormImportar({
  kams,
}: {
  kams: { id: string; nombre: string }[];
}) {
  const archivoRef = useRef<File | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [etapa, setEtapa] = useState("activo");
  const [kam, setKam] = useState("");
  const [analisis, setAnalisis] = useState<ResultadoAnalisis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<Extract<
    ResultadoImportacion,
    { ok: true }
  > | null>(null);
  const [revisando, startRevisar] = useTransition();
  const [importando, startImportar] = useTransition();

  function datos(cambios: { etapa?: string; kam?: string } = {}) {
    const fd = new FormData();
    fd.set("archivo", archivoRef.current!);
    fd.set("etapa", cambios.etapa ?? etapa);
    fd.set("kam", cambios.kam ?? kam);
    return fd;
  }

  function revisar(cambios?: { etapa?: string; kam?: string }) {
    if (!archivoRef.current) return;
    setError(null);
    startRevisar(async () => {
      try {
        const r = await revisarCartera(datos(cambios));
        if ("error" in r) {
          setAnalisis(null);
          setError(r.error);
        } else setAnalisis(r.resultado);
      } catch {
        setError(
          "No se pudo revisar el archivo. Revisa tu conexión e inténtalo de nuevo.",
        );
      }
    });
  }

  function importar() {
    setError(null);
    startImportar(async () => {
      try {
        const r = await importarCartera(datos());
        if ("error" in r) setError(r.error);
        else {
          setHecho(r);
          setAnalisis(null);
        }
      } catch {
        setError(
          "Se cortó la conexión. Revisa en Cuentas si se importaron antes de volver a intentarlo.",
        );
      }
    });
  }

  if (hecho) {
    const sinUbicar = hecho.importadas - hecho.ubicadas;
    return (
      <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
        <h2 className="text-lg font-semibold text-green-900">
          ✓ {hecho.importadas}{" "}
          {hecho.importadas === 1 ? "cuenta importada" : "cuentas importadas"}
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-green-900">
          <li>{hecho.ubicadas} ubicadas en el mapa.</li>
          {sinUbicar > 0 && (
            <li>
              {sinUbicar} sin ubicación: se fijará sola en la primera visita del
              KAM.
            </li>
          )}
          {hecho.omitidas > 0 && (
            <li>{hecho.omitidas} se omitieron por tener errores.</li>
          )}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/cuentas"
            className="rounded-lg bg-amber-800 px-4 py-2 font-medium text-white hover:bg-amber-900"
          >
            Ver cuentas
          </Link>
          <Link
            href="/mapa"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium"
          >
            Ver en el mapa
          </Link>
        </div>
      </section>
    );
  }

  const filas = analisis?.filas ?? [];
  const conError = filas.filter((f) => f.errores.length > 0);
  const listas = filas.filter((f) => f.errores.length === 0);
  const conAviso = listas.filter((f) => f.avisos.length > 0);
  const ocupado = revisando || importando;

  return (
    <div className="mt-6 space-y-5">
      {/* ---------- Paso 1 ---------- */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">1. Prepara el archivo</h2>
        <p className="mt-1 text-sm text-stone-600">
          Usa nuestra plantilla, o sube el Excel que ya tengas: reconocemos
          columnas como Cliente, Dirección, Colonia, Vendedor, Teléfono.
        </p>
        <a
          href="/exportar/plantilla"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Descargar plantilla
        </a>
      </section>

      {/* ---------- Paso 2 ---------- */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">2. Súbelo</h2>
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 px-4 py-6 text-center hover:border-amber-700">
          <span className="font-medium text-stone-800">
            {nombreArchivo || "Elegir archivo de Excel"}
          </span>
          <span className="text-sm text-stone-500">
            {nombreArchivo ? "Toca para cambiarlo" : ".xlsx o .csv"}
          </span>
          <input
            type="file"
            accept=".xlsx,.csv,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              archivoRef.current = f;
              setNombreArchivo(f.name);
              setHecho(null);
              revisar();
            }}
          />
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-stone-700">
              Si no traen etapa, ponerlas como
            </span>
            <select
              value={etapa}
              onChange={(e) => {
                setEtapa(e.target.value);
                revisar({ etapa: e.target.value });
              }}
              className={estiloSelect}
            >
              {Object.entries(nombreEtapa)
                .filter(([v]) => v !== "perdido")
                .map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-700">
              Si no traen KAM, asignarlas a
            </span>
            <select
              value={kam}
              onChange={(e) => {
                setKam(e.target.value);
                revisar({ kam: e.target.value });
              }}
              className={estiloSelect}
            >
              <option value="">Nadie (asignar después)</option>
              {kams.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {revisando && <p className="text-stone-600">Revisando el archivo…</p>}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {analisis?.problema && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {analisis.problema}
        </p>
      )}

      {/* ---------- Paso 3: vista previa ---------- */}
      {analisis && !analisis.problema && !revisando && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">3. Revisa antes de importar</h2>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Cifra
              valor={listas.length}
              texto="listas"
              color="text-green-700"
            />
            <Cifra
              valor={conAviso.length}
              texto="con avisos"
              color="text-stone-900"
            />
            <Cifra
              valor={conError.length}
              texto="con errores"
              color={conError.length ? "text-red-700" : "text-stone-900"}
            />
          </div>

          <p className="mt-4 text-sm font-medium text-stone-800">
            Así leímos tus columnas
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {analisis.columnas.map((c) => (
              <li
                key={c.campo}
                className="rounded-md bg-stone-100 px-2 py-1 text-stone-700"
              >
                {c.encabezado}
                {sinAcentos(c.encabezado) !==
                  sinAcentos(nombreCampo[c.campo]) && (
                  <span className="text-stone-500">
                    {" "}
                    → {nombreCampo[c.campo]}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {analisis.ignoradas.length > 0 && (
            <p className="mt-1 text-sm text-stone-500">
              No usamos: {analisis.ignoradas.join(", ")}
            </p>
          )}

          {conError.length > 0 && (
            <Grupo
              titulo={`Con errores: no se importarán (${conError.length})`}
              filas={conError}
              tono="error"
              abierto
            />
          )}
          {conAviso.length > 0 && (
            <Grupo
              titulo={`Se importan con avisos (${conAviso.length})`}
              filas={conAviso}
              tono="aviso"
            />
          )}
          <Grupo
            titulo={`Todas las que se importan (${listas.length})`}
            filas={listas}
            tono="ok"
          />

          {conError.length > 0 && (
            <p className="mt-4 text-sm text-stone-600">
              {listas.length === 1
                ? "Puedes importar ya la que está bien"
                : `Puedes importar ya las ${listas.length} que están bien`}{" "}
              y, después de corregir el Excel, subirlo otra vez: las que ya
              entraron se saltan solas.
            </p>
          )}

          <button
            type="button"
            onClick={importar}
            disabled={ocupado || listas.length === 0}
            className="mt-4 w-full rounded-lg bg-amber-800 px-4 py-3 font-medium text-white hover:bg-amber-900 disabled:opacity-50"
          >
            {importando
              ? "Importando y ubicando en el mapa…"
              : `Importar ${listas.length} ${listas.length === 1 ? "cuenta" : "cuentas"}`}
          </button>
          {importando && listas.length > 40 && (
            <p className="mt-2 text-center text-sm text-stone-500">
              Puede tardar un par de minutos. No cierres esta pantalla.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Cifra({
  valor,
  texto,
  color,
}: {
  valor: number;
  texto: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-2">
      <p className={`text-xl font-semibold tabular-nums ${color}`}>{valor}</p>
      <p className="text-xs text-stone-600">{texto}</p>
    </div>
  );
}

const MOSTRAR = 50;

function Grupo({
  titulo,
  filas,
  tono,
  abierto = false,
}: {
  titulo: string;
  filas: FilaAnalizada[];
  tono: "error" | "aviso" | "ok";
  abierto?: boolean;
}) {
  if (filas.length === 0) return null;
  const color = {
    error: "text-red-700",
    aviso: "text-orange-700",
    ok: "text-stone-600",
  }[tono];
  return (
    <details open={abierto} className="mt-4 rounded-lg border border-stone-200">
      <summary
        className={`cursor-pointer px-3 py-2 text-sm font-semibold ${color}`}
      >
        {titulo}
      </summary>
      <ul className="divide-y divide-stone-100 border-t border-stone-200 text-sm">
        {filas.slice(0, MOSTRAR).map((f) => (
          <li key={f.fila} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-stone-900">
                {f.datos.nombre || (
                  <span className="text-stone-400">(sin nombre)</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-stone-500">
                fila {f.fila}
              </span>
            </div>
            <p className="text-stone-600">
              {[
                f.datos.zona,
                `Cat. ${f.datos.categoria}`,
                nombreEtapa[f.datos.etapa],
                f.kamTexto || (f.datos.kam_id ? "KAM por defecto" : null),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {f.errores.map((e) => (
              <p key={e} className="text-red-700">
                ✕ {e}
              </p>
            ))}
            {f.avisos.map((a) => (
              <p key={a} className="text-orange-700">
                • {a}
              </p>
            ))}
          </li>
        ))}
      </ul>
      {filas.length > MOSTRAR && (
        <p className="border-t border-stone-200 px-3 py-2 text-sm text-stone-500">
          …y {filas.length - MOSTRAR} más.
        </p>
      )}
    </details>
  );
}
