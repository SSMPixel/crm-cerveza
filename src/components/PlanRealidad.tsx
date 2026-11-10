import Link from "next/link";
import { cumplimiento, type DiaPlan } from "@/lib/planRealidad";

const dia = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

function color(pct: number) {
  return pct >= 80
    ? "text-green-700"
    : pct >= 60
      ? "text-stone-900"
      : "text-orange-700";
}

/**
 * Con un KAM: día por día, qué del plan sí visitó y qué no.
 * Con todo el equipo: el % de cada KAM, con liga a su detalle.
 */
export function PlanRealidad({
  dias,
  kams,
  liga,
}: {
  dias: DiaPlan[];
  kams?: { id: string; nombre: string }[];
  liga?: (kamId: string) => string;
}) {
  const total = cumplimiento(dias);
  if (!total) return null;

  return (
    <section className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Plan contra realidad</h2>
        <span
          className={`text-lg font-semibold tabular-nums ${color(total.pct)}`}
        >
          {total.pct}%
        </span>
      </div>
      <p className="text-sm text-stone-600">
        Visitó {total.cumplidas} de las {total.planeadas} cuentas que la app le
        propuso en la mañana.
      </p>

      {kams ? (
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {kams.map((k) => {
            const c = cumplimiento(dias.filter((d) => d.kam_id === k.id));
            const fuera = dias
              .filter((d) => d.kam_id === k.id)
              .reduce((s, d) => s + d.fueraDePlan, 0);
            return (
              <li
                key={k.id}
                className="flex items-baseline justify-between gap-2 py-2"
              >
                <Link
                  href={liga?.(k.id) ?? "#"}
                  className="font-medium text-amber-800"
                >
                  {k.nombre}
                </Link>
                <span className="text-stone-600 tabular-nums">
                  {c ? (
                    <>
                      {c.cumplidas}/{c.planeadas}{" "}
                      <span className={`font-semibold ${color(c.pct)}`}>
                        {c.pct}%
                      </span>
                      {fuera > 0 && (
                        <span className="text-stone-500">
                          {" "}
                          · +{fuera} fuera
                        </span>
                      )}
                    </>
                  ) : (
                    "sin plan"
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {dias.map((d) => (
            <li key={d.fecha} className="py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium first-letter:uppercase">
                  {dia.format(new Date(`${d.fecha}T12:00:00Z`))}
                </span>
                <span className="tabular-nums text-stone-600">
                  {d.cumplidas}/{d.planeadas} del plan
                  {d.fueraDePlan > 0 && ` · +${d.fueraDePlan} fuera`}
                </span>
              </div>
              {d.faltaron.length > 0 && (
                <p className="mt-0.5 text-stone-600">
                  No visitó:{" "}
                  {d.faltaron.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/cuentas/${c.id}`}
                        className="underline underline-offset-2"
                      >
                        {c.nombre}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-stone-500">
        &ldquo;Fuera&rdquo; son visitas a cuentas que no estaban en el plan. No
        siempre es malo: puede ser una oportunidad que surgió en el día.
      </p>
    </section>
  );
}
