import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/sesion";
import { empresaEnVista } from "@/lib/clienteActivo";

// Barra superior del auditor: qué cliente está viendo y cómo cambiar.
export async function BarraCliente() {
  const perfil = await obtenerPerfil();
  if (perfil?.rol !== "auditor") return null;
  const empresaId = await empresaEnVista(perfil);
  if (!empresaId) return null;

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("empresas")
    .select("nombre")
    .eq("id", empresaId)
    .maybeSingle();

  return (
    <div className="sticky top-0 z-[1100] border-b border-amber-900/20 bg-amber-800 text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <span className="truncate">
          Viendo:{" "}
          <span className="font-semibold">{data?.nombre ?? "Cliente"}</span>
        </span>
        <Link
          href="/clientes"
          className="shrink-0 font-medium underline underline-offset-4"
        >
          Cambiar cliente
        </Link>
      </div>
    </div>
  );
}
