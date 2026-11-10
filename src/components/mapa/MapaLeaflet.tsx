"use client";

// El mapa solo puede dibujarse en el navegador (Leaflet necesita la ventana),
// por eso se carga aparte desde VistaMapa con ssr: false.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { EstadoSeguimiento } from "@/lib/formato";

export type PuntoMapa = {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  estado: EstadoSeguimiento;
  detalle: string;
};

// Llave pública de MapTiler (se restringe por dominio en su panel).
const llaveMapTiler = process.env.NEXT_PUBLIC_MAPTILER_KEY;

const colorEstado: Record<EstadoSeguimiento, string> = {
  vencida: "#f97316", // naranja
  hoy: "#16a34a", // verde
  al_dia: "#a8a29e", // gris
  cerrada: "#d6d3d1",
};

function iconoNumero(n: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:#15803d;color:#fff;display:grid;place-items:center;font:700 14px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const iconoYo = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Encuadra el mapa para que se vean todas las paradas (o todas las cuentas).
function Encuadre({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap();
  const clave = puntos.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (puntos.length === 0) return;
    if (puntos.length === 1) mapa.setView(puntos[0], 15);
    else
      mapa.fitBounds(L.latLngBounds(puntos), {
        padding: [40, 40],
        maxZoom: 16,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, mapa]);
  return null;
}

export default function MapaLeaflet({
  cuentas,
  ruta,
  yo,
}: {
  cuentas: PuntoMapa[];
  ruta: PuntoMapa[];
  yo: { lat: number; lng: number } | null;
}) {
  const enRuta = new Set(ruta.map((r) => r.id));
  const linea: [number, number][] = [
    ...(yo ? [[yo.lat, yo.lng] as [number, number]] : []),
    ...ruta.map((r) => [r.lat, r.lng] as [number, number]),
  ];
  const encuadre =
    ruta.length > 0
      ? linea
      : cuentas.map((c) => [c.lat, c.lng] as [number, number]);

  return (
    <MapContainer
      center={[19.4326, -99.1332]}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      {llaveMapTiler ? (
        // Mapa nítido (alta resolución) cuando hay llave de MapTiler.
        <TileLayer
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}@2x.png?key=${llaveMapTiler}`}
          tileSize={512}
          zoomOffset={-1}
          minZoom={1}
          maxZoom={20}
        />
      ) : (
        // Respaldo sin llave, suficiente para pruebas.
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
      )}
      <Encuadre puntos={encuadre} />

      {cuentas
        .filter((c) => !enRuta.has(c.id))
        .map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={7}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: colorEstado[c.estado],
              fillOpacity: 1,
            }}
          >
            <Popup>
              <Link href={`/cuentas/${c.id}`} style={{ fontWeight: 600 }}>
                {c.nombre}
              </Link>
              <br />
              {c.detalle}
            </Popup>
          </CircleMarker>
        ))}

      {linea.length > 1 && (
        <Polyline
          positions={linea}
          pathOptions={{ color: "#15803d", weight: 3, dashArray: "6 8" }}
        />
      )}

      {ruta.map((c, i) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={iconoNumero(i + 1)}>
          <Popup>
            <Link href={`/cuentas/${c.id}`} style={{ fontWeight: 600 }}>
              {i + 1}. {c.nombre}
            </Link>
            <br />
            {c.detalle}
          </Popup>
        </Marker>
      ))}

      {yo && <Marker position={[yo.lat, yo.lng]} icon={iconoYo} />}
    </MapContainer>
  );
}
