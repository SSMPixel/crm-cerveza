// HTML del correo semanal. Los correos no aceptan estilos modernos:
// se arma con tablas y estilos en línea para que Gmail y Outlook lo muestren bien.
import type { DatosResumen, Semaforo } from "@/lib/resumen";

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const dia = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const C = {
  tinta: "#1c1917",
  suave: "#57534e",
  tenue: "#a8a29e",
  borde: "#e7e5e4",
  fondo: "#fafaf9",
  marca: "#92400e",
};

const semaforo: Record<
  Semaforo,
  { texto: string; color: string; fondo: string }
> = {
  bien: { texto: "Va bien", color: "#166534", fondo: "#dcfce7" },
  atencion: { texto: "Atención", color: "#9a3412", fondo: "#ffedd5" },
  mal: { texto: "Va mal", color: "#991b1b", fondo: "#fee2e2" },
};

const colorAlerta = {
  alta: "#dc2626",
  media: "#f97316",
  baja: "#d6d3d1",
} as const;

function e(t: string | number | null | undefined) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fecha(iso: string) {
  return dia.format(new Date(`${iso}T12:00:00Z`));
}

function cifra(valor: string, etiqueta: string) {
  return `<td style="padding:12px 8px;text-align:center;background:${C.fondo};border-radius:8px">
    <div style="font-size:22px;font-weight:700;color:${C.tinta}">${valor}</div>
    <div style="font-size:12px;color:${C.suave};margin-top:2px">${etiqueta}</div></td>`;
}

export function asuntoResumen(d: DatosResumen) {
  return `Resumen semanal de ${d.empresa}: ${d.totales.visitas} visitas, ${d.alertas.filter((a) => a.severidad !== "baja").length} alertas`;
}

export function htmlResumen(d: DatosResumen, urlApp: string) {
  const t = d.totales;
  const pctAlDia = t.cartera ? Math.round((t.alDia / t.cartera) * 100) : 0;
  const pctVisitas = t.meta ? Math.round((t.visitas / t.meta) * 100) : 0;

  const filasKam = d.kams
    .map((k) => {
      const s = semaforo[k.semaforo];
      return `<tr>
        <td style="padding:10px 8px;border-top:1px solid ${C.borde};font-weight:600">${e(k.nombre)}</td>
        <td style="padding:10px 8px;border-top:1px solid ${C.borde};text-align:right">${k.visitas}/${k.meta}</td>
        <td style="padding:10px 8px;border-top:1px solid ${C.borde};text-align:right;color:${k.fueraDeRango ? "#c2410c" : C.tinta}">${k.fueraDeRango}</td>
        <td style="padding:10px 8px;border-top:1px solid ${C.borde};text-align:right">${k.avances}</td>
        <td style="padding:10px 8px;border-top:1px solid ${C.borde};text-align:right">${k.pedidos ? mxn.format(k.pedidos) : "—"}</td>
        <td style="padding:10px 8px;border-top:1px solid ${C.borde};text-align:right">
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;color:${s.color};background:${s.fondo}">${s.texto}</span>
        </td></tr>`;
    })
    .join("");

  const alertas = d.alertas.length
    ? d.alertas
        .slice(0, 6)
        .map(
          (
            a,
          ) => `<tr><td style="padding:10px 12px;border-left:4px solid ${colorAlerta[a.severidad]};background:${C.fondo};font-size:14px;color:${C.tinta}">${e(a.titulo)}</td></tr>
          <tr><td style="height:6px"></td></tr>`,
        )
        .join("")
    : `<tr><td style="font-size:14px;color:#15803d">✓ Sin alertas esta semana.</td></tr>`;

  const urgentes = d.urgentes.length
    ? d.urgentes
        .map(
          (
            u,
            i,
          ) => `<tr><td style="padding:8px 0;border-top:1px solid ${C.borde};font-size:14px">
            <strong>${i + 1}. ${e(u.nombre)}</strong>
            <span style="color:${C.suave}"> · ${e([u.zona, u.kam, `cat. ${u.categoria}`].filter(Boolean).join(" · "))}</span><br>
            <span style="color:${C.suave};font-size:13px">${e(u.motivo)}</span></td></tr>`,
        )
        .join("")
    : `<tr><td style="font-size:14px;color:#15803d">✓ No hay cuentas atrasadas.</td></tr>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(asuntoResumen(d))}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${C.tinta}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;padding:24px">

<tr><td>
  <div style="font-size:13px;color:${C.suave}">Resumen semanal · ${fecha(d.desde)} al ${fecha(d.hasta)}</div>
  <h1 style="margin:4px 0 0;font-size:22px;color:${C.tinta}">${e(d.empresa)}</h1>
</td></tr>

<tr><td style="padding-top:20px">
  <table role="presentation" width="100%" cellspacing="6" cellpadding="0"><tr>
    ${cifra(`${t.visitas}`, `visitas (${pctVisitas}% de la meta)`)}
    ${cifra(`${pctAlDia}%`, "cartera al día")}
    ${cifra(t.pedidos ? mxn.format(t.pedidos) : "$0", "pedidos reportados")}
  </tr><tr>
    ${cifra(`${t.avances}`, "cuentas avanzaron")}
    ${cifra(`${t.fueraDeRango}`, "visitas fuera de rango")}
    ${cifra(`${t.cartera - t.alDia}`, "cuentas por atender")}
  </tr></table>
</td></tr>

<tr><td style="padding-top:24px">
  <h2 style="margin:0 0 8px;font-size:16px">Por KAM</h2>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">
    <tr style="color:${C.suave};font-size:12px">
      <td style="padding:0 8px 6px">KAM</td><td style="padding:0 8px 6px;text-align:right">Visitas/meta</td>
      <td style="padding:0 8px 6px;text-align:right">Fuera</td><td style="padding:0 8px 6px;text-align:right">Avances</td>
      <td style="padding:0 8px 6px;text-align:right">Pedidos</td><td style="padding:0 8px 6px;text-align:right"></td>
    </tr>
    ${filasKam || `<tr><td style="color:${C.suave}">Sin KAMs activos.</td></tr>`}
  </table>
</td></tr>

<tr><td style="padding-top:24px">
  <h2 style="margin:0 0 8px;font-size:16px">Para revisar</h2>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${alertas}</table>
</td></tr>

<tr><td style="padding-top:24px">
  <h2 style="margin:0 0 4px;font-size:16px">Para planear la semana</h2>
  <div style="font-size:13px;color:${C.suave};margin-bottom:6px">Las 5 cuentas más urgentes.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${urgentes}</table>
</td></tr>

<tr><td style="padding-top:28px" align="center">
  <a href="${e(urlApp)}" style="display:inline-block;background:${C.marca};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px">Abrir la app</a>
</td></tr>

<tr><td style="padding-top:24px;font-size:12px;color:${C.tenue};text-align:center">
  Visitas y pedidos de los últimos 7 días, reportados por el equipo. La meta considera ${"5"} días hábiles.
</td></tr>

</table></td></tr></table></body></html>`;
}
