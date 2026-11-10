import { autorizado, enviarResumenesDelTurno } from "@/lib/envioResumenes";

// Lo llama Vercel automáticamente (ver vercel.json).
export async function GET(request: Request) {
  if (!autorizado(request))
    return new Response("No autorizado", { status: 401 });
  const resultados = await enviarResumenesDelTurno("manana");
  return Response.json({ turno: "manana", resultados });
}
