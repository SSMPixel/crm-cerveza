"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { distanciaRuta, ligaRutaGoogle, ordenarRuta } from "@/lib/ruta";
import { textoDistancia } from "@/lib/geo";
import type { Cuenta } from "@/components/TarjetaCuenta";
import { capitalizar, estados, nombreEtapa } from "@/lib/formato";
import type { PuntoMapa } from "./MapaLeaflet";

const MapaLeaflet = dynamic(() => import("./MapaLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-stone-500">
      Cargando mapa…
    </div>
  ),
});

type CuentaConUbicacion = Cuenta & { lat: number; lng: number };

function aPunto(c: CuentaConUbicacion): PuntoMapa {
  return {
    id: c.id,
    nombre: c.nombre,
    lat: c.lat,
    lng: c.lng,
    estado: c.estado_seguimiento,
    detalle: [capitalizar(c.tipo_lugar), c.zona, nombreEtapa[c.etapa]]
      .filter(Boolean)
      .join(" · "),
  };
}

export function VistaMapa({
  cuentas,
  plan,
  esKam,
}: {
  cuentas: Cuenta[];
  plan: Cuenta[];
  esKam: boolean;
}) {
  const [yo, setYo] = useState<{ lat: number; lng: number } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [quitadas, setQuitadas] = useState<Set<string>>(new Set());

  const ubicadas = cuentas.filter(
    (c): c is CuentaConUbicacion =>
      c.lat !== null && c.lng !== null && c.estado_seguimiento !== "cerrada",
  );

  // El plan se reordena desde donde está el KAM, y sin las paradas que quitó.
  const ruta = useMemo(
    () =>
      ordenarRuta(
        plan.filter((c) => !quitadas.has(c.id)),
        yo,
      ),
    [plan, quitadas, yo],
  );
  const rutaUbicada = ruta.filter(
    (c): c is CuentaConUbicacion => c.lat !== null && c.lng !== null,
  );
  const km = distanciaRuta(ruta, yo);
  const ligaGoogle = ligaRutaGoogle(ruta);

  function desdeAqui() {
    if (!("geolocation" in navigator)) return;
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setYo({ lat: p.coords.latitude, lng: p.coords.longitude });
        setBuscando(false);
      },
      () => setBuscando(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-[55vh] min-h-80 w-full border-b border-stone-200 sm:h-[60vh]">
        <MapaLeaflet
          cuentas={ubicadas.map(aPunto)}
          ruta={rutaUbicada.map(aPunto)}
          yo={yo}
        />
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
          {(["vencida", "hoy", "al_dia"] as const).map((e) => (
            <li key={e} className="flex items-center gap-1.5">
              <span
                className={`size-2.5 rounded-full ${estados[e].punto}`}
                aria-hidden
              />
              {estados[e].titulo}
            </li>
          ))}
          {esKam && (
            <li className="flex items-center gap-1.5">
              <span className="grid size-4 place-items-center rounded-full bg-amber-800 text-[9px] font-bold text-white">
                1
              </span>
              Tu ruta
            </li>
          )}
        </ul>

        {esKam && (
          <section className="mt-4">
            <div className="flex items-baseline justify-between">
              <h1 className="text-xl font-semibold">Ruta sugerida</h1>
              {rutaUbicada.length > 1 && (
                <span className="text-sm text-stone-600">
                  ≈ {textoDistancia(Math.round(km * 1000))}
                </span>
              )}
            </div>
            <p className="text-sm text-stone-600">
              Es una sugerencia: visita en el orden que te funcione.
            </p>

            {ruta.length === 0 ? (
              <p className="mt-4 text-stone-700">
                {plan.length === 0
                  ? "No tienes cuentas pendientes para hoy. ¡Bien!"
                  : "Quitaste todas las paradas."}
              </p>
            ) : (
              <>
                <ol className="mt-3 space-y-2">
                  {ruta.map((c, i) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-800 text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <Link
                        href={`/cuentas/${c.id}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate font-medium">{c.nombre}</p>
                        <p className="truncate text-sm text-stone-600">
                          {[c.zona, estados[c.estado_seguimiento].singular]
                            .filter(Boolean)
                            .join(" · ")}
                          {c.lat === null ? " · sin ubicación" : ""}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setQuitadas((q) => new Set(q).add(c.id))}
                        className="shrink-0 rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                        aria-label={`Quitar ${c.nombre} de la ruta`}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 grid gap-2">
                  {ligaGoogle && (
                    <a
                      href={ligaGoogle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg bg-amber-800 px-4 py-3 text-center font-medium text-white hover:bg-amber-900"
                    >
                      Abrir ruta en Google Maps
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={desdeAqui}
                    disabled={buscando}
                    className="rounded-lg border border-stone-300 bg-white px-4 py-3 font-medium text-stone-800 disabled:opacity-60"
                  >
                    {buscando
                      ? "Buscando tu ubicación…"
                      : yo
                        ? "Recalcular desde donde estoy"
                        : "Ordenar desde donde estoy"}
                  </button>
                  {quitadas.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuitadas(new Set())}
                      className="text-sm text-stone-600 underline underline-offset-4"
                    >
                      Restaurar las {quitadas.size} paradas que quitaste
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {!esKam && (
          <p className="mt-4 text-sm text-stone-600">
            {ubicadas.length} cuentas en el mapa. Toca un punto para ver la
            cuenta.
          </p>
        )}
      </div>
    </div>
  );
}
