// Convierte una dirección en coordenadas con MapTiler (misma llave del mapa).
// Si no se encuentra, la cuenta queda sin ubicación y la primera visita la fija.
import "server-only";

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
      features?: { center?: [number, number] }[];
    };
    const c = j.features?.[0]?.center;
    return c ? { lng: c[0], lat: c[1] } : null;
  } catch {
    return null;
  }
}
