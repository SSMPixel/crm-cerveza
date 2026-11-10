import Link from "next/link";

export default function NoEncontrada() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="text-center">
        <h1 className="text-xl font-semibold">No encontramos esta página</h1>
        <p className="mt-2 text-stone-600">
          Puede que la cuenta ya no exista o que no tengas acceso.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-amber-800 px-4 py-3 font-medium text-white"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
