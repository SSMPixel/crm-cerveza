// Miniaturas de las fotos de una visita; al tocarlas se abren en grande.
export function Miniaturas({
  rutas,
  ligas,
}: {
  rutas: string[];
  ligas: Record<string, string>;
}) {
  const visibles = rutas.filter((r) => ligas[r]);
  if (visibles.length === 0) return null;
  return (
    <div className="mt-2 flex gap-2">
      {visibles.map((r) => (
        <a key={r} href={ligas[r]} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ligas[r]}
            alt="Foto de la visita"
            loading="lazy"
            className="size-16 rounded-lg border border-stone-200 object-cover"
          />
        </a>
      ))}
    </div>
  );
}
