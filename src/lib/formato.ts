// Textos y cálculos de fechas que comparten varias pantallas.

export const nombreEtapa: Record<string, string> = {
  prospecto: "Prospecto",
  contactado: "Contactado",
  degustacion: "Degustación",
  negociacion: "Negociación",
  primer_pedido: "Primer pedido",
  activo: "Cliente activo",
  perdido: "Perdido",
};

export const nombreRol: Record<string, string> = {
  kam: "KAM",
  manager: "Manager",
  auditor: "Auditor",
};

export type EstadoSeguimiento = "vencida" | "hoy" | "al_dia" | "cerrada";

export const estados: Record<
  EstadoSeguimiento,
  { titulo: string; punto: string; texto: string }
> = {
  vencida: { titulo: "Vencidas", punto: "bg-red-600", texto: "text-red-700" },
  hoy: { titulo: "Tocan hoy", punto: "bg-amber-500", texto: "text-amber-700" },
  al_dia: { titulo: "Al día", punto: "bg-stone-400", texto: "text-stone-600" },
  cerrada: { titulo: "Perdidas", punto: "bg-stone-300", texto: "text-stone-500" },
};

// Fecha de hoy en Ciudad de México, como "AAAA-MM-DD".
export function hoyMx(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(
    new Date(),
  );
}

// Días entre hoy (CDMX) y una fecha "AAAA-MM-DD". Positivo = en el futuro.
export function diasDesdeHoy(fecha: string): number {
  const a = Date.parse(hoyMx() + "T00:00:00Z");
  const b = Date.parse(fecha.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export function textoFechaAccion(fecha: string): string {
  const d = diasDesdeHoy(fecha);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "venció ayer";
  if (d < 0) return `venció hace ${-d} días`;
  return `en ${d} días`;
}

export function textoUltimaVisita(dias: number | null): string {
  if (dias === null) return "Sin visitas";
  if (dias === 0) return "Visitada hoy";
  if (dias === 1) return "Visitada ayer";
  return `Visitada hace ${dias} días`;
}
