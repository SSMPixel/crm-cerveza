"use client";

// Si algo falla al cargar una pantalla, un mensaje claro en lugar de una página rota.
export default function ErrorPantalla({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo no cargó bien</h1>
        <p className="mt-2 text-stone-600">
          Puede ser la señal. Lo que ya guardaste no se perdió.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-amber-800 px-4 py-3 font-medium text-white hover:bg-amber-900"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
