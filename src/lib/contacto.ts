// Ligas para contactar a la cuenta desde el celular.

// WhatsApp necesita el número completo con lada de país (52 para México), solo dígitos.
// Acepta "55 1234 5678", "(55) 1234-5678", "+52 55 1234 5678", "521 55…".
export function ligaWhatsApp(
  telefono: string | null,
  texto?: string,
): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("521")) d = "52" + d.slice(3); // formato viejo de celular
  if (d.length === 10) d = "52" + d;
  if (d.length !== 12) return null;
  const mensaje = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${d}${mensaje}`;
}

export function ligaLlamada(telefono: string | null): string | null {
  if (!telefono) return null;
  const d = telefono.replace(/[^\d+]/g, "");
  return d ? `tel:${d}` : null;
}

export function ligaCorreo(correo: string | null): string | null {
  return correo ? `mailto:${correo}` : null;
}
