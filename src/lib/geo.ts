// Distancia en metros entre dos puntos (misma fórmula que usa la base de datos).
// En el celular solo sirve para avisar; el cálculo que cuenta lo hace el servidor.
export function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(a)));
}

export function textoDistancia(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

// Abre la dirección en la app de mapas del celular.
export function ligaComoLlegar(
  lat: number | null,
  lng: number | null,
  direccion: string | null,
) {
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (direccion) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}`;
  }
  return null;
}
