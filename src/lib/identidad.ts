// Identidad del prestador para avisos y contratos.
// Mientras falte un dato, los textos muestran el marcador entre corchetes y la
// app no publica el aviso propio ni deja publicar avisos de clientes.
export const identidad = {
  titular: "Sergio Sandoval Muciño",
  nombreComercial: null as string | null, // pendiente: sesión de nombre
  domicilio: null as string | null,
  correoPrivacidad: null as string | null, // requiere dominio propio
  dominio: null as string | null,
  version: "1.0",
  vigenteDesde: null as string | null, // AAAA-MM-DD
};

export function identidadCompleta() {
  return Object.values(identidad).every((v) => v !== null && v !== "");
}

export const marca = () => identidad.nombreComercial ?? "[Nombre comercial]";

export const prestador = () =>
  `${identidad.titular}, que opera como ${marca()}`;

/** ¿El texto todavía tiene campos por llenar, como "[Domicilio]"? */
export function marcadoresPendientes(texto: string): string[] {
  return [...new Set(texto.match(/\[[^\]\n]{2,80}\]/g) ?? [])];
}
