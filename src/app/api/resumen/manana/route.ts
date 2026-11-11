import { autorizado, enviarResumenesDelTurno } from "@/lib/envioResumenes";
import { aplicarConservacion } from "@/lib/conservacion";

// Lo llama Vercel automáticamente una vez al día (ver vercel.json).
// Además de los resúmenes de la mañana, aplica los plazos de conservación.
export async function GET(request: Request) {
  if (!autorizado(request))
    return new Response("No autorizado", { status: 401 });
  const resultados = await enviarResumenesDelTurno("manana");
  let conservacion: unknown;
  try {
    conservacion = await aplicarConservacion();
  } catch (e) {
    conservacion = { error: e instanceof Error ? e.message : String(e) };
  }
  return Response.json({ turno: "manana", resultados, conservacion });
}
