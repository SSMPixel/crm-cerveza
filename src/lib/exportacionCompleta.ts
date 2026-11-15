// Exportación de salida (Anexo C, C.4): toda la información de un cliente en
// un libro de varias pestañas, más la lista de sus fotos para empaquetarlas.
// Corre con la sesión de quien la pide: las reglas de la base deciden qué ve.
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { agregarHoja } from "@/lib/csv";
import {
  capitalizar,
  nombreEtapa,
  nombreResultado,
  nombreRol,
} from "@/lib/formato";
import { BUCKET_FOTOS } from "@/lib/fotos";

const PAGINA = 1000;
const zona = "America/Mexico_City";
const fmtFecha = new Intl.DateTimeFormat("en-CA", { timeZone: zona });
const fmtHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: zona,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const fecha = (v: string | null) => (v ? fmtFecha.format(new Date(v)) : "");
const hora = (v: string | null) => (v ? fmtHora.format(new Date(v)) : "");
const sino = (v: boolean | null) => (v ? "Sí" : "No");

type Fila = Record<string, unknown>;

/** Trae todas las filas de una tabla de la empresa, de mil en mil. */
async function todas(
  supabase: SupabaseClient,
  tabla: string,
  columnas: string,
  empresaId: string,
  orden: string,
): Promise<Fila[]> {
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select(columnas)
      .eq("empresa_id", empresaId)
      .order(orden, { ascending: true })
      .order("id", { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...((data ?? []) as unknown as Fila[]));
    if (!data || data.length < PAGINA) return filas;
  }
}

/** Texto seguro para un nombre de archivo. */
export function slug(texto: string, largo = 40) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, largo)
      .replace(/-+$/, "") || "sin-nombre"
  );
}

export type FotoExportada = { ruta: string; archivo: string };

/** Nombre de cada foto dentro del .zip: fecha, cuenta, KAM y número. */
function nombresFotos(
  visitas: Fila[],
  cuentas: Map<string, string>,
  gente: Map<string, string>,
) {
  const usados = new Set<string>();
  const porVisita = new Map<string, FotoExportada[]>();
  for (const v of visitas) {
    const rutas = (v.fotos as string[] | null) ?? [];
    const lista: FotoExportada[] = [];
    rutas.forEach((ruta, i) => {
      const ext = (
        ruta.match(/\.(jpe?g|png|webp)$/i)?.[1] ?? "jpg"
      ).toLowerCase();
      const base = [
        fecha(v.fecha_hora as string),
        slug(cuentas.get(v.cuenta_id as string) ?? "cuenta"),
        slug(gente.get(v.kam_id as string) ?? "kam", 24),
        i + 1,
      ].join("_");
      let archivo = `fotos/${base}.${ext}`;
      for (let n = 2; usados.has(archivo); n++)
        archivo = `fotos/${base}-${n}.${ext}`;
      usados.add(archivo);
      lista.push({ ruta, archivo });
    });
    if (lista.length) porVisita.set(v.id as string, lista);
  }
  return porVisita;
}

export async function armarExportacion(
  supabase: SupabaseClient,
  empresaId: string,
) {
  const { data: empresa, error: errEmpresa } = await supabase
    .from("empresas")
    .select("nombre")
    .eq("id", empresaId)
    .maybeSingle();
  if (errEmpresa || !empresa) throw new Error("Empresa no encontrada");

  const [
    perfiles,
    cuentas,
    objetivos,
    visitas,
    pedidos,
    acciones,
    cambios,
    comentarios,
    planes,
    solicitudes,
    avisos,
  ] = await Promise.all([
    todas(
      supabase,
      "perfiles",
      "id, nombre, correo, telefono, rol, activo, meta_visitas_dia, creado_en",
      empresaId,
      "creado_en",
    ),
    todas(
      supabase,
      "cuentas",
      "id, nombre, tipo_lugar, zona, direccion, lat, lng, categoria, etapa, kam_id, contacto_nombre, contacto_telefono, contacto_correo, objetivo_mensual_mxn, creada_en",
      empresaId,
      "creada_en",
    ),
    todas(
      supabase,
      "objetivos_cuenta",
      "id, cuenta_id, tipo, logrado, logrado_en",
      empresaId,
      "cuenta_id",
    ),
    todas(
      supabase,
      "visitas",
      "id, cuenta_id, kam_id, fecha_hora, distancia_m, precision_m, fuera_de_rango, motivo_fuera_rango, resultado, nota, fotos",
      empresaId,
      "fecha_hora",
    ),
    todas(
      supabase,
      "pedidos",
      "id, cuenta_id, kam_id, visita_id, fecha, monto_mxn, nota",
      empresaId,
      "fecha",
    ),
    todas(
      supabase,
      "proximas_acciones",
      "id, cuenta_id, kam_id, descripcion, fecha_compromiso, cumplida, creada_en",
      empresaId,
      "creada_en",
    ),
    todas(
      supabase,
      "cambios_etapa",
      "id, cuenta_id, etapa_anterior, etapa_nueva, usuario_id, fecha",
      empresaId,
      "fecha",
    ),
    todas(
      supabase,
      "comentarios",
      "id, cuenta_id, autor_id, texto, visibilidad, creado_en",
      empresaId,
      "creado_en",
    ),
    todas(
      supabase,
      "planes_dia",
      "id, kam_id, fecha, cuentas",
      empresaId,
      "fecha",
    ),
    todas(
      supabase,
      "solicitudes",
      "id, cuenta_id, tipo, solicitante_id, kam_destino_id, motivo, estado, respuesta, resuelta_por, creada_en, resuelta_en",
      empresaId,
      "creada_en",
    ),
    todas(
      supabase,
      "avisos_privacidad",
      "id, version, texto, publicado_por, publicado_en",
      empresaId,
      "version",
    ),
  ]);

  // Constancias: solo las de los avisos de esta empresa.
  const constancias: Fila[] = [];
  const idsAvisos = avisos.map((a) => a.id as string);
  if (idsAvisos.length) {
    const { data, error } = await supabase
      .from("constancias_aviso")
      .select("perfil_id, aviso_id, vista_en")
      .in("aviso_id", idsAvisos)
      .order("vista_en");
    if (error) throw new Error(`constancias: ${error.message}`);
    constancias.push(...((data ?? []) as Fila[]));
  }

  const gente = new Map(
    perfiles.map((p) => [p.id as string, p.nombre as string]),
  );
  const nombreCuenta = new Map(
    cuentas.map((c) => [c.id as string, c.nombre as string]),
  );
  const persona = (id: unknown) =>
    id ? (gente.get(id as string) ?? "Bluepace") : "";
  const cuenta = (id: unknown) => nombreCuenta.get(id as string) ?? "";
  const versionAviso = new Map(avisos.map((a) => [a.id as string, a.version]));

  const objetivosPor = new Map<string, Map<string, Fila>>();
  for (const o of objetivos) {
    const m = objetivosPor.get(o.cuenta_id as string) ?? new Map();
    m.set(o.tipo as string, o);
    objetivosPor.set(o.cuenta_id as string, m);
  }
  const objetivo = (cuentaId: string, tipo: string) => {
    const o = objetivosPor.get(cuentaId)?.get(tipo);
    return o?.logrado ? `Sí${o.logrado_en ? ` (${o.logrado_en})` : ""}` : "No";
  };

  const fotosPorVisita = nombresFotos(visitas, nombreCuenta, gente);
  const pedidoPorVisita = new Map<string, number>();
  for (const p of pedidos)
    if (p.visita_id)
      pedidoPorVisita.set(
        p.visita_id as string,
        (pedidoPorVisita.get(p.visita_id as string) ?? 0) + Number(p.monto_mxn),
      );

  const libro = new ExcelJS.Workbook();
  libro.creator = "Bluepace";
  const hoy = fmtFecha.format(new Date());

  const leeme = agregarHoja(
    libro,
    "Léeme",
    ["Contenido", "Detalle"],
    [
      ["Cliente", empresa.nombre],
      [
        "Fecha de exportación",
        `${hoy} ${hora(new Date().toISOString())} (hora del centro de México)`,
      ],
      ["Equipo", `${perfiles.length} personas`],
      ["Cuentas", cuentas.length],
      ["Visitas", visitas.length],
      ["Pedidos reportados", pedidos.length],
      ["Próximas acciones", acciones.length],
      ["Cambios de etapa", cambios.length],
      ["Mensajes de la conversación", comentarios.length],
      ["Planes del día", planes.length],
      ["Solicitudes", solicitudes.length],
      ["Versiones del aviso de privacidad", avisos.length],
      ["Fotos", [...fotosPorVisita.values()].reduce((s, l) => s + l.length, 0)],
      [
        "Ubicación del personal",
        "La plataforma no guarda las coordenadas del celular; solo la distancia al punto de venta, la precisión del GPS y la hora.",
      ],
      [
        "Fotos",
        'Van en la carpeta "fotos". La pestaña Visitas indica qué archivos corresponden a cada visita.',
      ],
      [
        "Plazos",
        "Visitas y actividad se conservan 24 meses y las fotos 12 meses; lo anterior ya se eliminó según el Anexo C.",
      ],
    ],
    { anchoMax: 90 },
  );
  leeme.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  agregarHoja(
    libro,
    "Equipo",
    [
      "Nombre",
      "Correo",
      "Teléfono",
      "Rol",
      "Activo",
      "Meta de visitas al día",
      "Alta",
    ],
    perfiles.map((p) => [
      p.nombre,
      p.correo,
      p.telefono,
      nombreRol[p.rol as string] ?? p.rol,
      sino(p.activo as boolean),
      p.meta_visitas_dia,
      fecha(p.creado_en as string),
    ]),
  );

  agregarHoja(
    libro,
    "Cuentas",
    [
      "Cuenta",
      "Tipo",
      "Zona",
      "Dirección",
      "Latitud",
      "Longitud",
      "Categoría",
      "Etapa",
      "KAM",
      "Contacto",
      "Teléfono",
      "Correo",
      "Objetivo mensual (MXN)",
      "Grifo",
      "Carta",
      "Exhibición",
      "Alta",
    ],
    cuentas.map((c) => [
      c.nombre,
      capitalizar(c.tipo_lugar as string | null),
      c.zona,
      c.direccion,
      c.lat,
      c.lng,
      c.categoria,
      nombreEtapa[c.etapa as string] ?? c.etapa,
      persona(c.kam_id),
      c.contacto_nombre,
      c.contacto_telefono,
      c.contacto_correo,
      c.objetivo_mensual_mxn === null ? "" : Number(c.objetivo_mensual_mxn),
      objetivo(c.id as string, "grifo"),
      objetivo(c.id as string, "carta"),
      objetivo(c.id as string, "exhibicion"),
      fecha(c.creada_en as string),
    ]),
    { montos: ["Objetivo mensual (MXN)"] },
  );

  agregarHoja(
    libro,
    "Visitas",
    [
      "Fecha",
      "Hora",
      "Cuenta",
      "KAM",
      "Resultado",
      "Ubicación",
      "Distancia (m)",
      "Precisión GPS (m)",
      "Motivo",
      "Pedido (MXN)",
      "Nota",
      "Archivos de fotos",
    ],
    visitas.map((v) => [
      fecha(v.fecha_hora as string),
      hora(v.fecha_hora as string),
      cuenta(v.cuenta_id),
      persona(v.kam_id),
      v.resultado
        ? (nombreResultado[v.resultado as string] ?? v.resultado)
        : "",
      v.distancia_m === null
        ? "Sin ubicación"
        : v.fuera_de_rango
          ? "Fuera de rango"
          : "En el lugar",
      v.distancia_m,
      v.precision_m,
      v.motivo_fuera_rango,
      pedidoPorVisita.get(v.id as string) ?? "",
      v.nota,
      (fotosPorVisita.get(v.id as string) ?? [])
        .map((f) => f.archivo.replace(/^fotos\//, ""))
        .join(", "),
    ]),
    { montos: ["Pedido (MXN)"] },
  );

  agregarHoja(
    libro,
    "Pedidos",
    ["Fecha", "Cuenta", "KAM", "Monto (MXN)", "Nota"],
    pedidos.map((p) => [
      p.fecha,
      cuenta(p.cuenta_id),
      persona(p.kam_id),
      Number(p.monto_mxn),
      p.nota,
    ]),
    { montos: ["Monto (MXN)"] },
  );

  agregarHoja(
    libro,
    "Próximas acciones",
    ["Creada", "Cuenta", "KAM", "Acción", "Fecha compromiso", "Cumplida"],
    acciones.map((a) => [
      fecha(a.creada_en as string),
      cuenta(a.cuenta_id),
      persona(a.kam_id),
      a.descripcion,
      a.fecha_compromiso,
      sino(a.cumplida as boolean),
    ]),
  );

  agregarHoja(
    libro,
    "Cambios de etapa",
    ["Fecha", "Cuenta", "De", "A", "Quién"],
    cambios.map((c) => [
      fecha(c.fecha as string),
      cuenta(c.cuenta_id),
      c.etapa_anterior
        ? (nombreEtapa[c.etapa_anterior as string] ?? c.etapa_anterior)
        : "",
      nombreEtapa[c.etapa_nueva as string] ?? c.etapa_nueva,
      persona(c.usuario_id),
    ]),
  );

  agregarHoja(
    libro,
    "Conversación",
    ["Fecha", "Hora", "Cuenta", "Autor", "Visible para", "Mensaje"],
    comentarios.map((c) => [
      fecha(c.creado_en as string),
      hora(c.creado_en as string),
      cuenta(c.cuenta_id),
      persona(c.autor_id),
      c.visibilidad === "privada_manager"
        ? "Manager y auditor"
        : "Todo el equipo",
      c.texto,
    ]),
    { anchoMax: 80 },
  );

  agregarHoja(
    libro,
    "Plan del día",
    ["Fecha", "KAM", "Cuentas en el plan"],
    planes.map((p) => [
      p.fecha,
      persona(p.kam_id),
      ((p.cuentas as string[] | null) ?? [])
        .map(cuenta)
        .filter(Boolean)
        .join(", "),
    ]),
    { anchoMax: 90 },
  );

  agregarHoja(
    libro,
    "Solicitudes",
    [
      "Creada",
      "Cuenta",
      "Tipo",
      "Pidió",
      "Pasar a",
      "Motivo",
      "Estado",
      "Respuesta",
      "Resolvió",
      "Resuelta",
    ],
    solicitudes.map((s) => [
      fecha(s.creada_en as string),
      cuenta(s.cuenta_id),
      s.tipo === "reasignar" ? "Pasar a otro KAM" : "Dar por perdida",
      persona(s.solicitante_id),
      persona(s.kam_destino_id),
      s.motivo,
      capitalizar(s.estado as string),
      s.respuesta,
      persona(s.resuelta_por),
      fecha(s.resuelta_en as string | null),
    ]),
  );

  const hojaAvisos = agregarHoja(
    libro,
    "Avisos de privacidad",
    ["Versión", "Publicado", "Publicó", "Texto"],
    avisos.map((a) => [
      a.version,
      fecha(a.publicado_en as string),
      persona(a.publicado_por),
      a.texto,
    ]),
    { anchoMax: 100 },
  );
  hojaAvisos.getColumn(4).alignment = { wrapText: true, vertical: "top" };

  agregarHoja(
    libro,
    "Constancias del aviso",
    ["Persona", "Versión", "Fecha", "Hora"],
    constancias.map((c) => [
      persona(c.perfil_id),
      versionAviso.get(c.aviso_id as string) ?? "",
      fecha(c.vista_en as string),
      hora(c.vista_en as string),
    ]),
  );

  const fotos = [...fotosPorVisita.values()].flat();
  const nombreBase = `bluepace-${slug(empresa.nombre as string)}-${hoy}`;
  return { libro, fotos, nombreBase };
}

/** Ligas temporales (1 hora) para descargar las fotos desde el navegador. */
export async function ligasExportacion(
  supabase: SupabaseClient,
  fotos: FotoExportada[],
) {
  const salida: { archivo: string; url: string | null }[] = [];
  for (let i = 0; i < fotos.length; i += 200) {
    const lote = fotos.slice(i, i + 200);
    const { data } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(
      lote.map((f) => f.ruta),
      3600,
    );
    const porRuta = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
    for (const f of lote)
      salida.push({ archivo: f.archivo, url: porRuta.get(f.ruta) ?? null });
  }
  return salida;
}
