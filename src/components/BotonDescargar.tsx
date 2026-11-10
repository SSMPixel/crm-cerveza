// Botón para descargar un archivo que se abre en Excel.
export function BotonDescargar({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
    >
      <span aria-hidden>↓</span> Excel
    </a>
  );
}
