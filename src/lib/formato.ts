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
  { titulo: string; singular: string; punto: string; texto: string }
> = {
  vencida: {
    titulo: "Atrasadas",
    singular: "Atrasada",
    punto: "bg-orange-500",
    texto: "text-orange-700",
  },
  hoy: {
    titulo: "Tocan hoy",
    singular: "Toca hoy",
    punto: "bg-green-600",
    texto: "text-green-700",
  },
  al_dia: {
    titulo: "Al día",
    singular: "Al día",
    punto: "bg-stone-400",
    texto: "text-stone-600",
  },
  cerrada: {
    titulo: "Perdidas",
    singular: "Perdida",
    punto: "bg-stone-300",
    texto: "text-stone-500",
  },
};

// Fecha de hoy en Ciudad de México, como "AAAA-MM-DD".
export function hoyMx(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());
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

// "bar" → "Bar". Los tipos de lugar se muestran siempre con mayúscula inicial.
export function capitalizar(texto: string | null): string {
  if (!texto) return "";
  return texto.charAt(0).toLocaleUpperCase("es-MX") + texto.slice(1);
}

// Inicio del día de hoy en CDMX, para filtrar visitas de hoy.
export function inicioDeHoyMx(): string {
  return `${hoyMx()}T00:00:00-06:00`;
}

export const estiloCategoria: Record<string, string> = {
  A: "bg-amber-800 text-white",
  B: "bg-amber-200 text-amber-950",
  C: "border border-stone-400 text-stone-600",
};

// "hoy", "ayer", "hace 5 días" para una fecha pasada "AAAA-MM-DD".
export function textoFechaPasada(fecha: string): string {
  const d = -diasDesdeHoy(fecha);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  return `hace ${d} días`;
}

// Resultado de la visita (lista corta y opcional).
export const resultadosVisita = [
  { valor: "degusto", texto: "Degustó" },
  { valor: "pidio_precios", texto: "Pidió precios" },
  { valor: "hizo_pedido", texto: "Hizo pedido" },
  { valor: "no_estaba_decisor", texto: "No estaba quien decide" },
  { valor: "cerrado", texto: "Estaba cerrado" },
  { valor: "seguimiento", texto: "Seguimiento de rutina" },
  { valor: "sin_interes", texto: "Sin interés" },
] as const;

export const nombreResultado: Record<string, string> = Object.fromEntries(
  resultadosVisita.map((r) => [r.valor, r.texto]),
);
