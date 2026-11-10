// Se muestra al instante mientras carga la siguiente pantalla.
export default function Cargando() {
  return (
    <main className="px-4 py-8" aria-busy="true" aria-label="Cargando">
      <div className="mx-auto w-full max-w-md animate-pulse space-y-3">
        <div className="h-4 w-24 rounded bg-stone-200" />
        <div className="h-7 w-48 rounded bg-stone-200" />
        <div className="mt-6 h-24 rounded-xl bg-stone-200" />
        <div className="h-20 rounded-xl bg-stone-200" />
        <div className="h-20 rounded-xl bg-stone-200" />
      </div>
    </main>
  );
}
