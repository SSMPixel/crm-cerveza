import { Navegacion } from "@/components/Navegacion";

// Todas las pantallas para usuarios con sesión comparten la barra de navegación.
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-20">{children}</div>
      <Navegacion />
    </>
  );
}
