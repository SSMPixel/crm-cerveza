import { Suspense } from "react";
import { Navegacion } from "@/components/Navegacion";
import { BarraCliente } from "@/components/auditor/BarraCliente";

// Todas las pantallas para usuarios con sesión comparten la barra de navegación.
// El auditor además ve arriba qué cliente está revisando.
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense>
        <BarraCliente />
      </Suspense>
      <div className="flex flex-1 flex-col pb-20">{children}</div>
      <Suspense>
        <Navegacion />
      </Suspense>
    </>
  );
}
