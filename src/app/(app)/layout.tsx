import { Suspense } from "react";
import { Navegacion } from "@/components/Navegacion";
import { BarraCliente } from "@/components/auditor/BarraCliente";
import { ControlAviso } from "@/components/privacidad/ControlAviso";

// Todas las pantallas para usuarios con sesión comparten la barra de navegación.
// El auditor además ve arriba qué cliente está revisando, y el personal del
// cliente ve su aviso de privacidad cuando hay una versión que no ha visto.
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
      {/* Aviso de privacidad del cliente pendiente de ver: encima de todo. */}
      <Suspense>
        <ControlAviso />
      </Suspense>
    </>
  );
}
