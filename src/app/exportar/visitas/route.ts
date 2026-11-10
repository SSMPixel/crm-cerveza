// Descarga del historial de visitas en CSV, con los mismos filtros de la pantalla.
import { hoyMx, nombreResultado } from "@/lib/formato";
import { contextoExportar, respuestaCsv } from "@/lib/csv";

const fecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});
const hora = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type Fila = {
  fecha_hora: string;
  distancia_m: number | null;
  fuera_de_rango: boolean;
  motivo_fuera_rango: string | null;
  nota: string | null;
  resultado: string | null;
  fotos: string[];
  cuentas: { nombre: string; zona: string | null } | null;
  perfiles: { nombre: string } | null;
  pedidos: { monto_mxn: number }[];
  proximas_acciones: { descripcion: string; fecha_compromiso: string }[];
};

export async function GET(request: Request) {
  const ctx = await contextoExportar();
  if (!ctx) return new Response("Sin sesión", { status: 401 });
  const { supabase, perfil, empresaId } = ctx;

  const p = new URL(request.url).searchParams;
  const kam = p.get("kam");
  const dias = ["1", "7", "30"].includes(p.get("dias") ?? "")
    ? Number(p.get("dias"))
    : 7;
  const desde = new Date(
    Date.parse(`${hoyMx()}T00:00:00-06:00`) - (dias - 1) * 86_400_000,
  ).toISOString();

  let q = supabase
    .from("visitas")
    .select(
      "fecha_hora, distancia_m, fuera_de_rango, motivo_fuera_rango, nota, resultado, fotos, cuentas(nombre, zona), perfiles(nombre), pedidos(monto_mxn), proximas_acciones(descripcion, fecha_compromiso)",
    )
    .gte("fecha_hora", desde)
    .order("fecha_hora", { ascending: false })
    .limit(5000);
  if (perfil.rol !== "kam" && kam) q = q.eq("kam_id", kam);
  if (empresaId) q = q.eq("empresa_id", empresaId);
  if (p.get("fuera") === "1") q = q.eq("fuera_de_rango", true);

  const { data, error } = await q;
  if (error) return new Response("No se pudo exportar", { status: 500 });

  const filas = ((data ?? []) as unknown as Fila[]).map((v) => {
    const f = new Date(v.fecha_hora);
    const accion = v.proximas_acciones[0];
    return [
      fecha.format(f),
      hora.format(f),
      v.perfiles?.nombre,
      v.cuentas?.nombre,
      v.cuentas?.zona,
      v.resultado ? nombreResultado[v.resultado] : "",
      v.fuera_de_rango ? "Fuera de rango" : "En el lugar",
      v.distancia_m,
      v.motivo_fuera_rango,
      v.pedidos.reduce((s, x) => s + Number(x.monto_mxn), 0) || "",
      accion?.descripcion,
      accion?.fecha_compromiso,
      v.nota,
      v.fotos?.length || "",
    ];
  });

  return respuestaCsv(
    `visitas-${hoyMx()}.csv`,
    [
      "Fecha",
      "Hora",
      "KAM",
      "Cuenta",
      "Zona",
      "Resultado",
      "Ubicación",
      "Distancia (m)",
      "Motivo",
      "Pedido (MXN)",
      "Próxima acción",
      "Fecha próxima acción",
      "Nota",
      "Fotos",
    ],
    filas,
  );
}
