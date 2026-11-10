// Descarga de la cartera (.xlsx).
import {
  capitalizar,
  estados,
  hoyMx,
  nombreEtapa,
  type EstadoSeguimiento,
} from "@/lib/formato";
import { contextoExportar, respuestaHoja } from "@/lib/csv";

export async function GET(request: Request) {
  const ctx = await contextoExportar();
  if (!ctx) return new Response("Sin sesión", { status: 401 });
  const { supabase, perfil, empresaId } = ctx;

  const kam = new URL(request.url).searchParams.get("kam");
  let q = supabase
    .from("vista_cuentas")
    .select(
      "nombre, tipo_lugar, zona, categoria, etapa, kam_nombre, estado_seguimiento, dias_sin_visita, accion_descripcion, accion_fecha, pedidos_mes_mxn, objetivo_mensual_mxn, contacto_nombre, contacto_telefono, contacto_correo, direccion",
    )
    .order("kam_nombre")
    .order("categoria")
    .order("nombre");
  if (perfil.rol !== "kam" && kam) q = q.eq("kam_id", kam);
  if (empresaId) q = q.eq("empresa_id", empresaId);

  const { data, error } = await q;
  if (error) return new Response("No se pudo exportar", { status: 500 });

  const filas = (data ?? []).map((c) => [
    c.nombre,
    capitalizar(c.tipo_lugar),
    c.zona,
    c.categoria,
    nombreEtapa[c.etapa] ?? c.etapa,
    c.kam_nombre,
    estados[c.estado_seguimiento as EstadoSeguimiento]?.singular ??
      c.estado_seguimiento,
    c.dias_sin_visita,
    c.accion_descripcion,
    c.accion_fecha,
    Number(c.pedidos_mes_mxn) || "",
    c.objetivo_mensual_mxn ?? "",
    c.contacto_nombre,
    c.contacto_telefono,
    c.contacto_correo,
    c.direccion,
  ]);

  return respuestaHoja(
    `cuentas-${hoyMx()}`,
    [
      "Cuenta",
      "Tipo",
      "Zona",
      "Categoría",
      "Etapa",
      "KAM",
      "Seguimiento",
      "Días sin visita",
      "Próxima acción",
      "Fecha próxima acción",
      "Pedidos del mes (MXN)",
      "Objetivo mensual (MXN)",
      "Contacto",
      "Teléfono",
      "Correo",
      "Dirección",
    ],
    filas,
    { montos: ["Pedidos del mes (MXN)", "Objetivo mensual (MXN)"] },
  );
}
