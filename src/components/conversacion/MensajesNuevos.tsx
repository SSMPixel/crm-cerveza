import Link from "next/link";
import type { SinLeer } from "@/lib/conversacion";

// Lista para Inicio: cuentas con mensajes que no he visto.
export function MensajesNuevos({ lista }: { lista: SinLeer[] }) {
  if (lista.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 font-semibold">
        Mensajes nuevos
        <span className="rounded-full bg-amber-800 px-2 py-0.5 text-xs font-bold text-white">
          {lista.reduce((s, m) => s + m.nuevos, 0)}
        </span>
      </h2>
      <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
        {lista.map((m) => (
          <li key={m.cuenta_id}>
            <Link
              href={`/cuentas/${m.cuenta_id}#conversacion`}
              className="block px-3 py-2.5 hover:bg-stone-50"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{m.cuenta}</span>
                {m.nuevos > 1 && (
                  <span className="shrink-0 text-xs text-stone-500">
                    {m.nuevos} mensajes
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-stone-600">
                <span className="font-medium text-stone-800">
                  {m.ultimo_autor}:
                </span>{" "}
                {m.ultimo_texto}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
