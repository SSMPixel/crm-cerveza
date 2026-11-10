"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { leerExcel } from "@/lib/leerExcel";
import { geocodificar } from "@/lib/geocodificar";
import {
  analizarCartera,
  textoParaUbicar,
  type Etapa,
  type ResultadoAnalisis,
} from "@/lib/importarCartera";

const etapas: Etapa[] = [
  "prospecto",
  "contactado",
  "degustacion",
  "negociacion",
  "primer_pedido",
  "activo",
  "perdido",
];
const MAX_MB = 4;

type Analisis =
  | { error: string }
  | { ok: true; resultado: ResultadoAnalisis; empresaId: string };

/** Lee el archivo y lo revisa contra el equipo y las cuentas que ya existen. */
async function analizar(formData: FormData): Promise<Analisis> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { error: "Tu sesión expiró. Vuelve a entrar." };
  if (perfil.rol === "kam")
    return { error: "Solo el manager puede importar la cartera." };
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) return { error: "Primero elige un cliente." };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0)
    return { error: "Elige un archivo de Excel." };
  if (archivo.size > MAX_MB * 1024 * 1024)
    return {
      error: `El archivo pesa más de ${MAX_MB} MB. Quita hojas o imágenes que no sean la cartera.`,
    };

  const matriz = await leerExcel(archivo);
  if ("error" in matriz) return matriz;

  const supabase = await crearClienteServidor();
  const [{ data: kams }, { data: existentes }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre, correo")
      .eq("empresa_id", empresaId)
      .eq("rol", "kam")
      .eq("activo", true),
    supabase
      .from("cuentas")
      .select("nombre, direccion")
      .eq("empresa_id", empresaId),
  ]);

  const etapa = String(formData.get("etapa") ?? "");
  const kam = String(formData.get("kam") ?? "");
  const resultado = analizarCartera(matriz, {
    kams: kams ?? [],
    existentes: existentes ?? [],
    etapaPorDefecto: etapas.includes(etapa as Etapa)
      ? (etapa as Etapa)
      : "activo",
    kamPorDefecto: (kams ?? []).some((k) => k.id === kam) ? kam : null,
  });
  return { ok: true, resultado, empresaId };
}

export async function revisarCartera(formData: FormData) {
  const r = await analizar(formData);
  if ("error" in r) return r;
  return { ok: true as const, resultado: r.resultado };
}

export type ResultadoImportacion =
  | { error: string }
  | { ok: true; importadas: number; ubicadas: number; omitidas: number };

export async function importarCartera(
  formData: FormData,
): Promise<ResultadoImportacion> {
  const r = await analizar(formData);
  if ("error" in r) return r;
  if (r.resultado.problema) return { error: r.resultado.problema };

  const buenas = r.resultado.filas.filter((f) => f.errores.length === 0);
  if (buenas.length === 0)
    return {
      error:
        "No hay cuentas listas para importar. Corrige los errores y vuelve a subir el archivo.",
    };

  // Ubicar en el mapa las que no traen coordenadas (8 a la vez).
  const pendientes = buenas.filter(
    (f) => f.datos.lat === null && textoParaUbicar(f.datos),
  );
  for (let i = 0; i < pendientes.length; i += 8) {
    await Promise.all(
      pendientes.slice(i, i + 8).map(async (f) => {
        const p = await geocodificar(textoParaUbicar(f.datos)!);
        if (p) Object.assign(f.datos, p);
      }),
    );
  }

  const registros = buenas.map(({ datos: d }) => ({
    empresa_id: r.empresaId,
    nombre: d.nombre,
    // La app no tiene ciudad ni CP aparte: se conservan en la dirección.
    direccion: d.direccion
      ? [d.direccion, d.cp && `CP ${d.cp}`, d.ciudad].filter(Boolean).join(", ")
      : null,
    zona: d.zona,
    tipo_lugar: d.tipo_lugar,
    categoria: d.categoria,
    etapa: d.etapa,
    kam_id: d.kam_id,
    contacto_nombre: d.contacto_nombre,
    contacto_telefono: d.contacto_telefono,
    contacto_correo: d.contacto_correo,
    objetivo_mensual_mxn: d.objetivo_mensual_mxn,
    lat: d.lat,
    lng: d.lng,
  }));

  // Todo o nada: si algo falla, no queda una cartera a medias.
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("cuentas").insert(registros);
  if (error) {
    console.error("importarCartera", error.message);
    return {
      error: error.message.includes("row-level security")
        ? "No tienes permiso para dar de alta cuentas en este cliente."
        : "No se pudo guardar. No se importó ninguna cuenta; inténtalo de nuevo.",
    };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    importadas: registros.length,
    ubicadas: registros.filter((x) => x.lat !== null).length,
    omitidas: r.resultado.filas.length - registros.length,
  };
}
