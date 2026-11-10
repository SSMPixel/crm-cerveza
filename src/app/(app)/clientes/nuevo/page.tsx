import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerPerfil } from "@/lib/sesion";
import { FormNuevoCliente } from "./FormNuevoCliente";

export const metadata = { title: "Nuevo cliente" };

export default function PaginaNuevoCliente() {
  return (
    <main className="px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/clientes" className="text-sm text-stone-600">
          ← Mis clientes
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Nuevo cliente</h1>
        <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
          <Revisar />
        </Suspense>
      </div>
    </main>
  );
}

async function Revisar() {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "auditor") redirect("/");
  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
      <FormNuevoCliente />
    </div>
  );
}
