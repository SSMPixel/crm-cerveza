// Lee una cartera que viene de Excel (ya convertida a una tabla de textos)
// y la deja lista para darla de alta: reconoce las columnas aunque se llamen
// distinto ("Cliente", "Vendedor", "Colonia"...), limpia los valores y marca
// lo que hay que corregir. No toca la base de datos: así se puede probar solo.
//
// Sin imports a propósito: se prueba con Node directo (supabase/tests/importar.test.mjs).

export type Campo =
  | "nombre"
  | "contacto_telefono"
  | "contacto_correo"
  | "contacto_nombre"
  | "direccion"
  | "zona"
  | "ciudad"
  | "cp"
  | "tipo_lugar"
  | "categoria"
  | "etapa"
  | "kam"
  | "objetivo"
  | "coordenadas"
  | "lat"
  | "lng";

export type Etapa =
  | "prospecto"
  | "contactado"
  | "degustacion"
  | "negociacion"
  | "primer_pedido"
  | "activo"
  | "perdido";

export type DatosCuenta = {
  nombre: string;
  direccion: string | null;
  zona: string | null;
  ciudad: string | null;
  cp: string | null;
  tipo_lugar: string | null;
  categoria: "A" | "B" | "C";
  etapa: Etapa;
  kam_id: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_correo: string | null;
  objetivo_mensual_mxn: number | null;
  lat: number | null;
  lng: number | null;
};

export type FilaAnalizada = {
  /** Número de fila como lo ve la persona en Excel. */
  fila: number;
  datos: DatosCuenta;
  /** Texto original del KAM, para mostrarlo en la vista previa. */
  kamTexto: string;
  errores: string[];
  avisos: string[];
};

export type ResultadoAnalisis = {
  columnas: { campo: Campo; encabezado: string }[];
  ignoradas: string[];
  filas: FilaAnalizada[];
  /** Mensaje si el archivo no se pudo entender (p. ej. no hay columna de nombre). */
  problema: string | null;
};

export type Opciones = {
  kams: { id: string; nombre: string; correo?: string | null }[];
  existentes: { nombre: string; direccion: string | null }[];
  etapaPorDefecto: Etapa;
  kamPorDefecto: string | null;
};

export const MAX_FILAS = 2000;

/** minúsculas, sin acentos, solo letras/números separados por un espacio. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Nombres con los que suele venir cada columna (ya normalizados).
// El orden importa: en un empate gana el campo que aparece primero.
const sinonimos: [Campo, string[]][] = [
  [
    "contacto_telefono",
    [
      "telefono",
      "tel",
      "telefonos",
      "celular",
      "cel",
      "whatsapp",
      "movil",
      "telefono contacto",
    ],
  ],
  [
    "contacto_correo",
    ["correo", "email", "e mail", "mail", "correo electronico"],
  ],
  [
    "contacto_nombre",
    [
      "contacto",
      "nombre contacto",
      "nombre del contacto",
      "persona de contacto",
      "encargado",
      "gerente",
      "comprador",
      "dueno",
      "propietario",
    ],
  ],
  [
    "kam",
    [
      "kam",
      "vendedor",
      "vendedora",
      "ejecutivo",
      "ejecutiva",
      "asesor",
      "asesora",
      "representante",
      "agente",
      "responsable",
      "ejecutivo de cuenta",
      "vendedor asignado",
      "key account manager",
    ],
  ],
  [
    "nombre",
    [
      "nombre",
      "cuenta",
      "cliente",
      "nombre cuenta",
      "nombre de la cuenta",
      "nombre cliente",
      "nombre del cliente",
      "nombre comercial",
      "establecimiento",
      "punto de venta",
      "pdv",
      "negocio",
      "razon social",
      "local",
    ],
  ],
  [
    "direccion",
    [
      "direccion",
      "domicilio",
      "calle",
      "calle y numero",
      "ubicacion",
      "direccion completa",
    ],
  ],
  ["zona", ["zona", "colonia", "col", "barrio", "sector", "territorio"]],
  [
    "ciudad",
    ["ciudad", "municipio", "alcaldia", "delegacion", "localidad", "poblacion"],
  ],
  ["cp", ["cp", "c p", "codigo postal", "cod postal"]],
  [
    "tipo_lugar",
    [
      "tipo",
      "tipo de lugar",
      "giro",
      "canal",
      "segmento",
      "tipo de negocio",
      "tipo de cliente",
      "tipo de cuenta",
    ],
  ],
  [
    "categoria",
    [
      "categoria",
      "clasificacion",
      "abc",
      "prioridad",
      "nivel",
      "categoria abc",
      "cat",
    ],
  ],
  ["etapa", ["etapa", "estatus", "status", "situacion", "etapa del pipeline"]],
  [
    "objetivo",
    [
      "objetivo",
      "meta",
      "objetivo mensual",
      "meta mensual",
      "cuota",
      "presupuesto",
      "venta objetivo",
      "objetivo mxn",
      "objetivo mensual mxn",
    ],
  ],
  [
    "coordenadas",
    ["coordenadas", "coords", "gps", "lat lng", "latlng", "lat long"],
  ],
  ["lat", ["lat", "latitud", "latitude"]],
  ["lng", ["lng", "lon", "long", "longitud", "longitude"]],
];

// Columnas que son claves o números internos ("No. cliente", "ID cuenta").
const palabrasDeClave = new Set([
  "id",
  "no",
  "num",
  "clave",
  "codigo",
  "folio",
  "sku",
]);

function contieneFrase(texto: string, frase: string) {
  return ` ${texto} `.includes(` ${frase} `);
}

/** ¿Qué campo es este encabezado? null si no lo reconocemos. */
export function campoDeEncabezado(encabezado: string): Campo | null {
  const t = normalizar(encabezado);
  if (!t) return null;
  for (const [campo, lista] of sinonimos) if (lista.includes(t)) return campo;
  if (t.split(" ").some((p) => palabrasDeClave.has(p))) return null;
  let mejor: Campo | null = null;
  let puntos = 0;
  for (const [campo, lista] of sinonimos) {
    for (const s of lista) {
      const p = s.split(" ").length;
      if (p > puntos && contieneFrase(t, s)) {
        mejor = campo;
        puntos = p;
      }
    }
  }
  return mejor;
}

/** Busca la fila de encabezados en las primeras 15 filas. */
export function detectarEncabezados(matriz: string[][]) {
  let mejor: { fila: number; columnas: Map<Campo, number> } | null = null;
  for (let f = 0; f < Math.min(matriz.length, 15); f++) {
    const columnas = new Map<Campo, number>();
    matriz[f].forEach((celda, c) => {
      const campo = campoDeEncabezado(celda ?? "");
      if (campo && !columnas.has(campo)) columnas.set(campo, c);
    });
    if (columnas.size >= 2 && (!mejor || columnas.size > mejor.columnas.size))
      mejor = { fila: f, columnas };
  }
  return mejor;
}

// ---------- Valores ----------

const tiposPorPalabra: [string, string[]][] = [
  ["cantina", ["cantina"]],
  ["hotel", ["hotel", "motel", "hostal"]],
  ["distribuidor", ["distribuidor", "distribuidora", "mayorista", "mayoreo"]],
  [
    "cadena",
    [
      "cadena",
      "autoservicio",
      "supermercado",
      "super",
      "oxxo",
      "club",
      "conveniencia",
    ],
  ],
  [
    "tienda",
    [
      "tienda",
      "abarrotes",
      "minisuper",
      "deposito",
      "vinateria",
      "licoreria",
      "botella",
      "retail",
    ],
  ],
  [
    "restaurante",
    [
      "restaurante",
      "restaurant",
      "rest",
      "fonda",
      "cocina",
      "comedor",
      "taqueria",
      "pizzeria",
      "cafe",
      "cafeteria",
    ],
  ],
  [
    "bar",
    [
      "bar",
      "bares",
      "pub",
      "cerveceria",
      "taproom",
      "brewpub",
      "antro",
      "mezcaleria",
      "terraza",
    ],
  ],
];

export function tipoDeLugar(valor: string): string | null {
  const t = normalizar(valor);
  if (!t) return null;
  const palabras = t.split(" ");
  for (const [tipo, lista] of tiposPorPalabra)
    if (lista.some((p) => palabras.includes(p))) return tipo;
  return "otro";
}

const etapasPorPalabra: [Etapa, string[]][] = [
  ["primer_pedido", ["primer pedido", "primera compra"]],
  [
    "perdido",
    [
      "perdido",
      "perdida",
      "inactivo",
      "inactiva",
      "baja",
      "cerrado",
      "cerrada",
      "suspendido",
    ],
  ],
  ["degustacion", ["degustacion", "cata", "muestra", "muestras"]],
  ["negociacion", ["negociacion", "cotizacion", "propuesta", "negociando"]],
  ["contactado", ["contactado", "contactada", "contacto"]],
  ["prospecto", ["prospecto", "prospect", "nuevo", "lead"]],
  [
    "activo",
    [
      "activo",
      "activa",
      "cliente activo",
      "cliente",
      "recurrente",
      "compra",
      "vigente",
    ],
  ],
];

export function etapaDe(valor: string): Etapa | null {
  const t = normalizar(valor);
  if (!t) return null;
  for (const [etapa, lista] of etapasPorPalabra)
    if (lista.some((p) => contieneFrase(t, p))) return etapa;
  return null;
}

export function categoriaDe(valor: string): "A" | "B" | "C" | null {
  const t = normalizar(valor);
  const m = t.match(/(?:^| )([abc])(?: |$)/);
  if (m) return m[1].toUpperCase() as "A" | "B" | "C";
  if (["1", "alta"].includes(t)) return "A";
  if (["2", "media"].includes(t)) return "B";
  if (["3", "baja"].includes(t)) return "C";
  return null;
}

/** "$15,000.00 MXN" → 15000. null si no es un número. */
export function numeroDe(valor: string): number | null {
  const t = valor.replace(/mxn|pesos|\$|,|\s/gi, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Teléfonos que Excel guardó como número ("5512345678.0", "5.51E+09"). */
export function telefonoDe(valor: string): string | null {
  let t = valor.trim();
  if (!t) return null;
  if (/^\d+(\.0+)?$/.test(t)) t = t.replace(/\.0+$/, "");
  else if (/^\d(\.\d+)?e\+\d+$/i.test(t)) t = String(Math.round(Number(t)));
  return t;
}

// México, a grandes rasgos.
const dentroDeMexico = (lat: number, lng: number) =>
  lat >= 14 && lat <= 33 && lng >= -118.5 && lng <= -86;

function punto(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return null;
  if (dentroDeMexico(lat, lng)) return { lat, lng };
  if (dentroDeMexico(lng, lat)) return { lat: lng, lng: lat }; // venían al revés
  return null;
}

/** Nombre del KAM → id. Acepta nombre completo, solo nombre, iniciales o correo. */
export function buscarKam(
  valor: string,
  kams: Opciones["kams"],
): { id: string } | { error: string } | null {
  const t = normalizar(valor);
  if (!t) return null;
  const correo = valor.trim().toLowerCase();
  const porCorreo = kams.find(
    (k) => k.correo && k.correo.toLowerCase() === correo,
  );
  if (porCorreo) return { id: porCorreo.id };
  const exactos = kams.filter((k) => normalizar(k.nombre) === t);
  if (exactos.length === 1) return { id: exactos[0].id };
  // "Mónica", "Mónica R", "M Rodríguez": cada palabra es el inicio de una palabra del nombre, en orden.
  const partes = t.split(" ");
  const parecidos = kams.filter((k) => {
    const nombre = normalizar(k.nombre).split(" ");
    let i = 0;
    for (const p of partes) {
      while (i < nombre.length && !nombre[i].startsWith(p)) i++;
      if (i === nombre.length) return false;
      i++;
    }
    return true;
  });
  if (parecidos.length === 1) return { id: parecidos[0].id };
  if (parecidos.length > 1)
    return {
      error: `"${valor}" coincide con varias personas del equipo. Escribe el nombre completo.`,
    };
  return {
    error: `No encontramos a "${valor}" en el equipo. Revisa el nombre o dalo de alta primero.`,
  };
}

const claveDuplicado = (nombre: string, direccion: string | null) => ({
  nombre: normalizar(nombre),
  direccion: normalizar(direccion ?? ""),
});

function mismaCuenta(
  a: { nombre: string; direccion: string },
  b: { nombre: string; direccion: string },
) {
  return (
    a.nombre === b.nombre &&
    (!a.direccion || !b.direccion || a.direccion === b.direccion)
  );
}

// ---------- Todo junto ----------

export function analizarCartera(
  matriz: string[][],
  opciones: Opciones,
): ResultadoAnalisis {
  const vacio = (problema: string): ResultadoAnalisis => ({
    columnas: [],
    ignoradas: [],
    filas: [],
    problema,
  });

  const enc = detectarEncabezados(matriz);
  if (!enc)
    return vacio(
      "No reconocimos las columnas. Revisa que la primera fila tenga títulos como Nombre, Dirección, Zona, KAM.",
    );
  if (!enc.columnas.has("nombre"))
    return vacio(
      'Falta la columna con el nombre de la cuenta. Ponle de título "Nombre" (o "Cliente", "Cuenta").',
    );

  const titulos = matriz[enc.fila];
  const usadas = new Set(enc.columnas.values());
  const columnas = [...enc.columnas.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([campo, c]) => ({ campo, encabezado: String(titulos[c]).trim() }));
  const ignoradas = titulos
    .map((t, c) =>
      usadas.has(c) || !String(t ?? "").trim() ? null : String(t).trim(),
    )
    .filter((t): t is string => t !== null);

  const valor = (fila: string[], campo: Campo) => {
    const c = enc.columnas.get(campo);
    return c === undefined ? "" : String(fila[c] ?? "").trim();
  };

  const existentes = opciones.existentes.map((e) =>
    claveDuplicado(e.nombre, e.direccion),
  );
  const vistas: { clave: ReturnType<typeof claveDuplicado>; fila: number }[] =
    [];
  const filas: FilaAnalizada[] = [];

  for (let f = enc.fila + 1; f < matriz.length; f++) {
    const fila = matriz[f];
    if (!fila || fila.every((c) => !String(c ?? "").trim())) continue;
    if (filas.length >= MAX_FILAS) break;

    const errores: string[] = [];
    const avisos: string[] = [];
    const nombre = valor(fila, "nombre");
    if (!nombre) errores.push("Falta el nombre de la cuenta.");

    // Categoría
    const catTexto = valor(fila, "categoria");
    let categoria = categoriaDe(catTexto);
    if (!categoria) {
      if (catTexto)
        avisos.push(`Categoría "${catTexto}" no es A, B o C: quedó como C.`);
      categoria = "C";
    }

    // Etapa
    const etapaTexto = valor(fila, "etapa");
    let etapa = etapaDe(etapaTexto);
    if (!etapa) {
      if (etapaTexto)
        avisos.push(
          `No entendimos la etapa "${etapaTexto}": quedó como la elegida por defecto.`,
        );
      etapa = opciones.etapaPorDefecto;
    }

    // KAM
    const kamTexto = valor(fila, "kam");
    let kam_id: string | null = null;
    const kam = buscarKam(kamTexto, opciones.kams);
    if (kam && "id" in kam) kam_id = kam.id;
    else if (kam && "error" in kam) errores.push(kam.error);
    else if (opciones.kamPorDefecto) kam_id = opciones.kamPorDefecto;
    else avisos.push("Sin KAM asignado.");

    // Contacto
    const correoTexto = valor(fila, "contacto_correo");
    let contacto_correo: string | null = correoTexto.toLowerCase() || null;
    if (
      contacto_correo &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto_correo)
    ) {
      avisos.push(`El correo "${correoTexto}" no parece válido: no se guardó.`);
      contacto_correo = null;
    }

    // Objetivo
    const objTexto = valor(fila, "objetivo");
    let objetivo = numeroDe(objTexto);
    if (objTexto && (objetivo === null || objetivo <= 0)) {
      avisos.push(
        `El objetivo "${objTexto}" no es un monto válido: no se guardó.`,
      );
      objetivo = null;
    }

    // Ubicación que ya viene en el archivo
    let ubicacion: { lat: number; lng: number } | null = null;
    const coord = valor(fila, "coordenadas");
    if (coord) {
      const m = coord.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
      ubicacion = m ? punto(Number(m[1]), Number(m[2])) : null;
    } else if (valor(fila, "lat") || valor(fila, "lng")) {
      ubicacion = punto(
        numeroDe(valor(fila, "lat")),
        numeroDe(valor(fila, "lng")),
      );
    }
    if ((coord || valor(fila, "lat")) && !ubicacion)
      avisos.push(
        "Las coordenadas no caen en México: se buscará por dirección.",
      );

    const datos: DatosCuenta = {
      nombre,
      direccion: valor(fila, "direccion") || null,
      zona: valor(fila, "zona") || null,
      ciudad: valor(fila, "ciudad") || null,
      // Excel suele comerse el 0 inicial del CP (06700 → 6700).
      cp: telefonoDe(valor(fila, "cp"))?.replace(/^(\d{4})$/, "0$1") ?? null,
      tipo_lugar: tipoDeLugar(valor(fila, "tipo_lugar")),
      categoria,
      etapa,
      kam_id,
      contacto_nombre: valor(fila, "contacto_nombre") || null,
      contacto_telefono: telefonoDe(valor(fila, "contacto_telefono")),
      contacto_correo,
      objetivo_mensual_mxn: objetivo,
      lat: ubicacion?.lat ?? null,
      lng: ubicacion?.lng ?? null,
    };

    // Repetidas
    if (nombre) {
      const clave = claveDuplicado(nombre, datos.direccion);
      if (existentes.some((e) => mismaCuenta(e, clave)))
        errores.push("Ya existe en la app: no se volverá a dar de alta.");
      else {
        const antes = vistas.find((v) => mismaCuenta(v.clave, clave));
        if (antes) errores.push(`Repetida: es igual a la fila ${antes.fila}.`);
        else vistas.push({ clave, fila: f + 1 });
      }
    }

    filas.push({ fila: f + 1, datos, kamTexto, errores, avisos });
  }

  if (filas.length === 0)
    return {
      columnas,
      ignoradas,
      filas,
      problema: "El archivo no tiene cuentas debajo de los títulos.",
    };
  return { columnas, ignoradas, filas, problema: null };
}

/** Texto para buscar la ubicación en el mapa. null si no hay con qué. */
export function textoParaUbicar(d: DatosCuenta): string | null {
  if (!d.direccion) return null;
  return [d.direccion, d.zona, d.cp, d.ciudad ?? "Ciudad de México", "México"]
    .filter(Boolean)
    .join(", ");
}
