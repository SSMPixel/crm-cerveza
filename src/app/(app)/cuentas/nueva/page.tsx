import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";
import { kamsDeEmpresa } from "@/lib/equipo";
import { FormCuenta } from "@/components/FormCuenta";

export const metadata = { title: "Nueva cuenta" };

export default function PaginaNuevaCuenta() {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Link href="/cuentas" className="text-sm text-stone-600">
          ← Cuentas
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Nueva cuenta</h1>
        <Suspense fallback={<p className="mt-4 text-stone-500">Cargando…</p>}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/");
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) redirect("/clientes");
  const kams = perfil.rol === "kam" ? [] : await kamsDeEmpresa(empresaId);
  return <FormCuenta esKam={perfil.rol === "kam"} kams={kams} />;
}
