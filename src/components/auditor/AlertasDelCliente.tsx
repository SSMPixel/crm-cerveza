import { cargarClientes } from "@/lib/datosClientes";
import { ListaAlertas } from "./ListaAlertas";

// En el inicio del auditor, dentro de un cliente: lo que conviene revisar con su manager.
export async function AlertasDelCliente({ empresaId }: { empresaId: string }) {
  const [cliente] = await cargarClientes(empresaId);
  if (!cliente) return null;
  return (
    <section className="mt-6">
      <h2 className="font-semibold">Para revisar con el manager</h2>
      <div className="mt-2">
        <ListaAlertas
          alertas={cliente.alertas}
          managers={cliente.managers}
          cliente={cliente.nombre}
        />
      </div>
    </section>
  );
}
