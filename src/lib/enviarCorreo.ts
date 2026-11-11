// Envío de correos con Resend (resend.com), usando su API directamente.
import "server-only";

export async function enviarCorreo({
  para,
  cc = [],
  asunto,
  html,
}: {
  para: string[];
  cc?: string[];
  asunto: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const llave = process.env.RESEND_API_KEY;
  if (!llave) return { ok: false, error: "Falta RESEND_API_KEY en Vercel." };

  // Mientras no haya dominio propio, todo puede desviarse a un solo correo de prueba.
  const soloA = process.env.RESUMEN_SOLO_A?.trim();
  const destinatarios = soloA ? [soloA] : para;
  const copias = soloA ? [] : cc.filter((c) => !destinatarios.includes(c));
  if (destinatarios.length === 0)
    return { ok: false, error: "Sin destinatarios." };

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Bluepace <onboarding@resend.dev>",
      to: destinatarios,
      cc: copias.length ? copias : undefined,
      subject: asunto,
      html,
    }),
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    return {
      ok: false,
      error: `Resend respondió ${r.status}: ${detalle.slice(0, 200)}`,
    };
  }
  return { ok: true };
}
