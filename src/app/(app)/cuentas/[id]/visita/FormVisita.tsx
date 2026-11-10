"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { distanciaMetros, textoDistancia } from "@/lib/geo";
import { nombreEtapa, resultadosVisita } from "@/lib/formato";
import { registrarVisita, type EstadoVisita } from "./acciones";
import { AvancePedidos } from "@/components/AvancePedidos";
import { FotosVisita } from "@/components/FotosVisita";

type Props = {
  cuentaId: string;
  empresaId: string;
  cuentaLat: number | null;
  cuentaLng: number | null;
  radio: number;
  etapaActual: string;
  accionPendiente: string | null;
  pedidosMes: number;
  objetivo: number | null;
  hoy: string; // "AAAA-MM-DD" en CDMX, calculado en el servidor
};

type Ubicacion =
  | { estado: "buscando" }
  | { estado: "lista"; lat: number; lng: number; precision: number }
  | { estado: "error"; mensaje: string };

const motivos = [
  "Llamada",
  "WhatsApp",
  "Cita en otro lugar",
  "GPS sin señal",
  "Otro",
];
const etapasElegibles = [
  "prospecto",
  "contactado",
  "degustacion",
  "negociacion",
  "primer_pedido",
  "activo",
];

const atajosFecha = [
  { texto: "Mañana", dias: 1 },
  { texto: "En 3 días", dias: 3 },
  { texto: "En 1 semana", dias: 7 },
  { texto: "En 2 semanas", dias: 14 },
];

function sumarDias(fecha: string, dias: number) {
  const d = new Date(fecha + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// La fecha elegida, dicha en español (el calendario del celular puede estar en inglés).
const fechaLarga = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const estiloCampo =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20";

export function FormVisita(p: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoVisita>({});
  const [enviando, iniciar] = useTransition();
  const [resultado, setResultado] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [ubicacion, setUbicacion] = useState<Ubicacion>({ estado: "buscando" });
  const [intento, setIntento] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState("");
  const [monto, setMonto] = useState("");
  const montoNumero = Number(monto.replace(/[$,\s]/g, "")) || 0;
  const [errores, setErrores] = useState<Record<string, string>>({});
  const hoy = p.hoy;

  // Algunos navegadores viejos no dan ubicación: se detecta sin esperar.
  const sinSoporte =
    typeof window !== "undefined" && !("geolocation" in navigator);

  useEffect(() => {
    if (sinSoporte) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUbicacion({
          estado: "lista",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: Math.round(pos.coords.accuracy),
        }),
      (err) =>
        setUbicacion({
          estado: "error",
          mensaje:
            err.code === err.PERMISSION_DENIED
              ? "No diste permiso de ubicación. Actívalo en tu navegador para registrar visitas en el lugar."
              : "No pudimos obtener tu ubicación.",
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [intento, sinSoporte]);

  const ubicacionActual: Ubicacion = sinSoporte
    ? { estado: "error", mensaje: "Este navegador no puede dar tu ubicación." }
    : ubicacion;

  const distancia =
    ubicacionActual.estado === "lista" &&
    p.cuentaLat !== null &&
    p.cuentaLng !== null
      ? distanciaMetros(
          p.cuentaLat,
          p.cuentaLng,
          ubicacionActual.lat,
          ubicacionActual.lng,
        )
      : null;
  const pideMotivo =
    ubicacionActual.estado === "error" ||
    (distancia !== null && distancia > p.radio);

  // Validación propia, con mensajes en español junto a cada campo
  // (los avisos nativos del navegador se ven distintos en cada uno y a veces vacíos).
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    // El envío lo controla esta función (no el navegador), para que si algo
    // falla el formulario NO se borre y el KAM pueda reintentar.
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nuevos: Record<string, string> = {};
    if (pideMotivo && !fd.get("motivo"))
      nuevos.motivo = "Elige por qué registras desde aquí.";
    if (
      pideMotivo &&
      fd.get("motivo") === "Otro" &&
      !String(fd.get("motivo_otro") ?? "").trim()
    )
      nuevos.motivo = "Cuéntanos el motivo.";
    if (!String(fd.get("accion") ?? "").trim())
      nuevos.accion = "Escribe la próxima acción.";
    const f = String(fd.get("accion_fecha") ?? "");
    if (!f) nuevos.fecha = "Elige la fecha de la próxima acción.";
    else if (f < hoy) nuevos.fecha = "La fecha no puede ser en el pasado.";
    const m = String(fd.get("monto") ?? "").replace(/[$,\s]/g, "");
    if (m && (Number.isNaN(Number(m)) || Number(m) <= 0))
      nuevos.monto = "Escribe un monto válido.";

    setErrores(nuevos);
    const primero = Object.keys(nuevos)[0];
    if (primero) {
      document
        .getElementById(`campo-${primero}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    fd.set("fotos", JSON.stringify(fotos));
    setEstado({});
    iniciar(async () => {
      try {
        const r = await registrarVisita(p.cuentaId, fd);
        if (r.ok) router.push(`/cuentas/${p.cuentaId}?registrada=1`);
        else setEstado(r);
      } catch {
        setEstado({
          error:
            "No se pudo guardar: parece que no hay conexión. Lo que escribiste sigue aquí; inténtalo de nuevo cuando tengas señal.",
        });
      }
    });
  }

  // Enter en un campo de texto no envía el formulario (en el celular se presiona sin querer).
  function evitarEnter(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT")
      e.preventDefault();
  }

  return (
    <form
      onSubmit={enviar}
      onKeyDown={evitarEnter}
      onChange={() => {
        if (Object.keys(errores).length > 0) setErrores({});
      }}
      noValidate
      className="mt-6 space-y-6"
    >
      {/* ---------- Ubicación ---------- */}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-600">Ubicación</h2>
        {ubicacionActual.estado === "buscando" && (
          <p className="mt-1">Obteniendo tu ubicación…</p>
        )}
        {ubicacionActual.estado === "lista" && (
          <p className="mt-1">
            {distancia === null
              ? "Ubicación lista. Esta visita fijará la ubicación de la cuenta."
              : distancia <= p.radio
                ? `Estás en el lugar (a ${textoDistancia(distancia)}).`
                : `Estás a ${textoDistancia(distancia)} de la cuenta.`}
          </p>
        )}
        {ubicacionActual.estado === "error" && (
          <>
            <p className="mt-1 text-orange-700">{ubicacionActual.mensaje}</p>
            <button
              type="button"
              onClick={() => {
                setUbicacion({ estado: "buscando" });
                setIntento((n) => n + 1);
              }}
              className="mt-2 text-sm font-medium text-amber-800 underline underline-offset-4"
            >
              Intentar de nuevo
            </button>
          </>
        )}
        {ubicacionActual.estado === "lista" && (
          <>
            <input type="hidden" name="lat" value={ubicacionActual.lat} />
            <input type="hidden" name="lng" value={ubicacionActual.lng} />
          </>
        )}

        {pideMotivo && (
          <fieldset id="campo-motivo" className="mt-4">
            <legend className="text-sm font-medium">
              ¿Por qué registras desde aquí?
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {motivos.map((m) => (
                <label
                  key={m}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    motivo === m
                      ? "border-amber-800 bg-amber-800 text-white"
                      : "border-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m}
                    className="sr-only"
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                  />
                  {m}
                </label>
              ))}
            </div>
            {motivo === "Otro" && (
              <input
                name="motivo_otro"
                placeholder="Cuéntanos el motivo"
                className={estiloCampo}
              />
            )}
            {errores.motivo && (
              <p
                role="alert"
                className="mt-1.5 text-sm font-medium text-red-700"
              >
                {errores.motivo}
              </p>
            )}
            <p className="mt-2 text-xs text-stone-500">
              La visita se guarda igual; solo queda marcada para tu manager.
            </p>
          </fieldset>
        )}
      </section>

      {/* ---------- Resultado ---------- */}
      <fieldset>
        <legend className="font-medium">
          ¿Cómo fue?{" "}
          <span className="text-sm font-normal text-stone-500">(opcional)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {resultadosVisita.map((r) => (
            <button
              key={r.valor}
              type="button"
              aria-pressed={resultado === r.valor}
              onClick={() => setResultado(resultado === r.valor ? "" : r.valor)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                resultado === r.valor
                  ? "border-amber-800 bg-amber-800 text-white"
                  : "border-stone-300 bg-white"
              }`}
            >
              {r.texto}
            </button>
          ))}
        </div>
        <input type="hidden" name="resultado" value={resultado} />
      </fieldset>

      {/* ---------- Lo pendiente ---------- */}
      {p.accionPendiente && (
        <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <input
            type="checkbox"
            name="cumplio"
            defaultChecked
            className="mt-1 size-5 accent-amber-800"
          />
          <span>
            <span className="block text-sm text-stone-600">
              Lo que tenías pendiente
            </span>
            <span className="block">{p.accionPendiente}</span>
            <span className="block text-sm text-stone-500">
              Márcalo si ya quedó.
            </span>
          </span>
        </label>
      )}

      {/* ---------- Próxima acción ---------- */}
      <section>
        <label id="campo-accion" className="block">
          <span className="font-medium">Próxima acción</span>
          <input
            name="accion"
            enterKeyHint="next"
            placeholder="Ej. Llevar degustación de la nueva lager"
            className={estiloCampo}
          />
        </label>
        {errores.accion && (
          <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
            {errores.accion}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {atajosFecha.map((a) => {
            const valor = sumarDias(hoy, a.dias);
            return (
              <button
                key={a.texto}
                type="button"
                onClick={() => setFecha(valor)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  fecha === valor
                    ? "border-amber-800 bg-amber-800 text-white"
                    : "border-stone-300 bg-white"
                }`}
              >
                {a.texto}
              </button>
            );
          })}
        </div>
        <label id="campo-fecha" className="mt-2 block">
          <span className="text-sm text-stone-600">Fecha</span>
          <input
            type="date"
            name="accion_fecha"
            min={hoy}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={estiloCampo}
          />
        </label>
        {fecha && (
          <p className="mt-1 text-sm text-stone-600 first-letter:uppercase">
            {fechaLarga.format(new Date(`${fecha}T12:00:00Z`))}
          </p>
        )}
        {errores.fecha && (
          <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
            {errores.fecha}
          </p>
        )}
      </section>

      {/* ---------- Opcionales ---------- */}
      <section className="space-y-4">
        <label className="block">
          <span className="font-medium">¿Avanzó de etapa?</span>
          <select name="etapa" defaultValue="" className={estiloCampo}>
            <option value="">Sigue en {nombreEtapa[p.etapaActual]}</option>
            {etapasElegibles
              .filter((e) => e !== p.etapaActual)
              .map((e) => (
                <option key={e} value={e}>
                  {nombreEtapa[e]}
                </option>
              ))}
          </select>
        </label>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <label className="block">
            <span className="font-medium">Pedido</span>{" "}
            <span className="text-sm text-stone-500">(opcional)</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 mt-1 flex items-center text-stone-500">
                $
              </span>
              <input
                id="campo-monto"
                name="monto"
                inputMode="decimal"
                enterKeyHint="done"
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className={`${estiloCampo} pl-7`}
              />
            </div>
          </label>
          {errores.monto && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
              {errores.monto}
            </p>
          )}
          {(p.objetivo !== null || p.pedidosMes > 0) && (
            <div className="mt-3">
              <AvancePedidos
                compacto
                pedidosMes={p.pedidosMes + montoNumero}
                objetivo={p.objetivo}
              />
            </div>
          )}
        </div>

        <FotosVisita
          empresaId={p.empresaId}
          cuentaId={p.cuentaId}
          onCambio={(rutas, subiendo) => {
            setFotos(rutas);
            setSubiendoFotos(subiendo);
          }}
        />

        <label className="block">
          <span className="font-medium">Nota</span>{" "}
          <span className="text-sm text-stone-500">(opcional)</span>
          <textarea
            name="nota"
            rows={3}
            placeholder="Qué pasó en la visita"
            className={estiloCampo}
          />
        </label>
      </section>

      {estado.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          enviando || subiendoFotos || ubicacionActual.estado === "buscando"
        }
        className="sticky bottom-20 w-full rounded-lg bg-amber-800 px-4 py-3.5 text-base font-medium text-white shadow-lg hover:bg-amber-900 disabled:opacity-60"
      >
        {enviando
          ? "Guardando…"
          : subiendoFotos
            ? "Subiendo fotos…"
            : ubicacionActual.estado === "buscando"
              ? "Esperando ubicación…"
              : "Guardar visita"}
      </button>
    </form>
  );
}
