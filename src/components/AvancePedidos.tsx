// Pedidos del mes contra el objetivo de la cuenta. Se usa en el detalle
// y dentro del formulario de visita, para empujar el pedido en el momento.

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function AvancePedidos({
  pedidosMes,
  objetivo,
  ultimoMonto,
  ultimoTexto,
  compacto = false,
}: {
  pedidosMes: number;
  objetivo: number | null;
  ultimoMonto?: number | null;
  ultimoTexto?: string | null;
  compacto?: boolean;
}) {
  const falta = objetivo !== null ? Math.max(objetivo - pedidosMes, 0) : null;
  const pct = objetivo
    ? Math.min(100, Math.round((pedidosMes / objetivo) * 100))
    : 0;

  return (
    <div
      className={
        compacto ? "" : "rounded-xl border border-stone-200 bg-white p-4"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={compacto ? "text-sm text-stone-600" : "font-semibold"}>
          Este mes
        </span>
        <span className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900">
            {mxn.format(pedidosMes)}
          </span>
          {objetivo !== null && <> de {mxn.format(objetivo)}</>}
        </span>
      </div>

      {objetivo !== null && (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full ${falta === 0 ? "bg-green-600" : "bg-amber-700"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-stone-700">
            {falta === 0
              ? "Objetivo del mes cumplido."
              : `Faltan ${mxn.format(falta!)} para el objetivo.`}
          </p>
        </>
      )}
      {objetivo === null && !compacto && (
        <p className="mt-1 text-sm text-stone-500">
          Sin objetivo mensual definido.
        </p>
      )}

      {ultimoMonto != null && ultimoTexto && (
        <p className="mt-1 text-sm text-stone-500">
          Último pedido: {mxn.format(ultimoMonto)} · {ultimoTexto}
        </p>
      )}
    </div>
  );
}
