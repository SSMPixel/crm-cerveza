// Convierte una dirección en coordenadas con MapTiler (misma llave del mapa).
// Si no se encuentra, la cuenta queda sin ubicación y la primera visita la fija.
import "server-only";

const vagos = new Set([
  "country",
  "region",
  "subregion",
  "county",
  "joint_municipality",
  "joint_submunicipality",
  "municipality",
  "municipal_district",
  "locality",
  "neighbourhood",
  "place",
  "postal_code",
]);

export async function geocodificar(
  direccion: string,
): Promise<{ lat: number; lng: number } | null> {
  const llave = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!llave || !direccion.trim()) return null;
  try {
    const url =
      `https://api.maptiler.com/geocoding/${encodeURIComponent(direccion)}.json` +
      `?key=${llave}&country=mx&language=es&limit=1&proximity=-99.1332,19.4326`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      features?: { center?: [number, number]; place_type?: string[] }[];
    };
    const f = j.features?.[0];
    // Si solo encontró la colonia, la ciudad o el CP, es demasiado vago para el
    // check-in (300 m): mejor sin ubicación y que la fije la primera visita.
    if (!f?.center || f.place_type?.every((t) => vagos.has(t))) return null;
    return { lng: f.center[0], lat: f.center[1] };
  } catch {
    return null;
  }
}
