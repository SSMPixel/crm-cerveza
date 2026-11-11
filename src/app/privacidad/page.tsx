import { notFound } from "next/navigation";
import { identidadCompleta } from "@/lib/identidad";
import { avisoPropioTexto } from "@/lib/avisoPropio";
import { TextoAviso } from "@/components/privacidad/TextoAviso";

export const metadata = { title: "Aviso de privacidad" };

// Página pública. No se publica hasta tener completos los datos del responsable
// (nombre comercial, domicilio, correo y dominio): un aviso con huecos no sirve.
export default function PaginaPrivacidad() {
  if (!identidadCompleta()) notFound();
  return (
    <main className="px-4 py-8">
      <article className="mx-auto w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-5">
        <TextoAviso texto={avisoPropioTexto()} />
      </article>
    </main>
  );
}
