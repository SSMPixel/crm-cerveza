// Envío automático de los resúmenes semanales. Lo llama Vercel una vez en la
// mañana y otra en la tarde; cada empresa recibe el suyo en su día y turno.
import "server-only";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { datosResumen } from "@/lib/resumen";
import { asuntoResumen, htmlResumen } from "@/lib/correoResumen";
import { enviarCorreo } from "@/lib/enviarCorreo";
import { hoyMx } from "@/lib/formato";

const numeroDia: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function urlApp() {
  const dominio =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "crm-cerveza.vercel.app";
  return `https://${dominio}`;
}

export async function enviarResumenesDelTurno(turno: "manana" | "tarde") {
  const supabase = crearClienteAdmin();
  const hoy = hoyMx();
  const diaHoy =
    numeroDia[
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Mexico_City",
        weekday: "short",
      }).format(new Date())
    ];

  const [{ data: empresas }, { data: auditores }, { data: yaEnviados }] =
    await Promise.all([
      supabase.from("empresas").select("id, nombre, resumen_dia, resumen_hora"),
      supabase
        .from("perfiles")
        .select("correo")
        .eq("rol", "auditor")
        .eq("activo", true),
      supabase.from("resumenes_enviados").select("empresa_id").eq("fecha", hoy),
    ]);

  const enviados = new Set((yaEnviados ?? []).map((r) => r.empresa_id));
  const copiaAuditor = (auditores ?? []).map((a) => a.correo);
  const resultados: { empresa: string; resultado: string }[] = [];

  for (const e of empresas ?? []) {
    const turnoEmpresa =
      Number(String(e.resumen_hora).slice(0, 2)) < 12 ? "manana" : "tarde";
    if (e.resumen_dia !== diaHoy || turnoEmpresa !== turno) continue;
    if (enviados.has(e.id)) {
      resultados.push({ empresa: e.nombre, resultado: "ya enviado hoy" });
      continue;
    }

    const datos = await datosResumen(supabase, e.id);
    if (!datos) continue;
    const para = datos.managers.map((m) => m.correo);
    const envio = await enviarCorreo({
      para: para.length ? para : copiaAuditor,
      cc: para.length ? copiaAuditor : [],
      asunto: asuntoResumen(datos),
      html: htmlResumen(datos, urlApp()),
    });

    if (envio.ok) {
      await supabase
        .from("resumenes_enviados")
        .insert({
          empresa_id: e.id,
          fecha: hoy,
          destinatarios: [...para, ...copiaAuditor],
        });
      resultados.push({ empresa: e.nombre, resultado: "enviado" });
    } else {
      resultados.push({ empresa: e.nombre, resultado: envio.error });
    }
  }
  return resultados;
}

/** Vercel firma sus llamadas con CRON_SECRET; cualquier otra se rechaza. */
export function autorizado(request: Request) {
  const secreto = process.env.CRON_SECRET;
  return (
    !!secreto && request.headers.get("authorization") === `Bearer ${secreto}`
  );
}
