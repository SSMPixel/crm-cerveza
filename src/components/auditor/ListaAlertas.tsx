import type { Alerta } from "@/lib/alertas";
import { AvisarManager } from "./AvisarManager";

const estilo: Record<Alerta["severidad"], string> = {
  alta: "border-l-red-600",
  media: "border-l-orange-500",
  baja: "border-l-stone-300",
};

export function ListaAlertas({
  alertas,
  managers,
  cliente,
  maximo,
}: {
  alertas: Alerta[];
  managers: { nombre: string; correo: string; telefono: string | null }[];
  cliente: string;
  maximo?: number;
}) {
  if (alertas.length === 0) {
    return (
      <p className="text-sm text-green-700">
        ✓ Sin alertas. El equipo va bien.
      </p>
    );
  }
  const visibles = maximo ? alertas.slice(0, maximo) : alertas;
  return (
    <ul className="space-y-2">
      {visibles.map((a) => (
        <li
          key={a.titulo}
          className={`rounded-lg border border-l-4 border-stone-200 bg-white p-3 ${estilo[a.severidad]}`}
        >
          <p className="text-sm font-medium text-stone-900">{a.titulo}</p>
          <div className="mt-2">
            <AvisarManager
              compacto
              managers={managers}
              mensaje={a.mensaje}
              asunto={`${cliente}: ${a.titulo}`}
            />
          </div>
        </li>
      ))}
      {maximo && alertas.length > maximo && (
        <li className="text-xs text-stone-500">
          y {alertas.length - maximo} alertas más
        </li>
      )}
    </ul>
  );
}
