import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { kamsDeEmpresa } from "@/lib/equipo";
import { FormImportar } from "./FormImportar";

export const metadata = { title: "Importar cartera" };
// Ubicar cientos de direcciones en el mapa puede tardar un par de minutos.
export const maxDuration = 300;

export default function PaginaImportar() {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-3xl">
        <Link href="/cuentas" className="text-sm text-stone-600">
          ← Cuentas
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Importar cartera</h1>
        <p className="mt-1 text-stone-600">
          Da de alta muchas cuentas de una vez desde un Excel.
        </p>
        <Suspense fallback={<p className="mt-6 text-stone-500">Cargando…</p>}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const perfil = await obtenerPerfil();
  if (!perfil || perfil.rol === "kam") redirect("/cuentas");
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) redirect("/clientes");
  const kams = await kamsDeEmpresa(empresaId);
  return <FormImportar kams={kams} />;
}
