"use client";

// Tomar o elegir hasta 3 fotos durante la visita. Cada foto se reduce en el
// celular (para gastar menos datos) y se sube en cuanto se elige, así que al
// guardar la visita ya no hay que esperar.
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

const MAXIMO = 3;
const LADO_MAXIMO = 1600; // px

type Foto = {
  id: string;
  vista: string;
  ruta: string | null;
  estado: "subiendo" | "lista" | "error";
};

async function reducir(archivo: File): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo, {
      imageOrientation: "from-image",
    });
    const k = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * k);
    lienzo.height = Math.round(imagen.height * k);
    lienzo
      .getContext("2d")!
      .drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    return await new Promise((ok, mal) =>
      lienzo.toBlob(
        (b) => (b ? ok(b) : mal(new Error("sin imagen"))),
        "image/jpeg",
        0.8,
      ),
    );
  } catch {
    return archivo; // si el navegador no puede reducirla, se intenta tal cual
  }
}

export function FotosVisita({
  empresaId,
  cuentaId,
  onCambio,
}: {
  empresaId: string;
  cuentaId: string;
  onCambio: (rutas: string[], subiendo: boolean) => void;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);

  function actualizar(siguiente: Foto[]) {
    setFotos(siguiente);
    onCambio(
      siguiente
        .filter((f) => f.estado === "lista" && f.ruta)
        .map((f) => f.ruta!),
      siguiente.some((f) => f.estado === "subiendo"),
    );
  }

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []).slice(
      0,
      MAXIMO - fotos.length,
    );
    e.target.value = "";
    if (archivos.length === 0) return;

    const nuevas: Foto[] = archivos.map((a) => ({
      id: crypto.randomUUID(),
      vista: URL.createObjectURL(a),
      ruta: null,
      estado: "subiendo",
    }));
    let lista = [...fotos, ...nuevas];
    actualizar(lista);

    const supabase = crearClienteNavegador();
    await Promise.all(
      archivos.map(async (archivo, i) => {
        const foto = nuevas[i];
        const ruta = `${empresaId}/${cuentaId}/${foto.id}.jpg`;
        const blob = await reducir(archivo);
        const { error } = await supabase.storage
          .from("fotos-visitas")
          .upload(ruta, blob, { contentType: blob.type || "image/jpeg" });
        lista = lista.map((f) =>
          f.id === foto.id
            ? {
                ...f,
                ruta: error ? null : ruta,
                estado: error ? "error" : "lista",
              }
            : f,
        );
        actualizar(lista);
      }),
    );
  }

  function quitar(id: string) {
    actualizar(fotos.filter((f) => f.id !== id));
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p>
        <span className="font-medium">Fotos</span>{" "}
        <span className="text-sm text-stone-500">
          (opcional, hasta {MAXIMO})
        </span>
      </p>
      <p className="text-sm text-stone-500">
        Grifo, carta, exhibición o lo que quieras mostrar.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {fotos.map((f) => (
          <div
            key={f.id}
            className="relative size-20 overflow-hidden rounded-lg border border-stone-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.vista} alt="" className="size-full object-cover" />
            {f.estado !== "lista" && (
              <span
                className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[11px] text-white ${
                  f.estado === "error" ? "bg-red-700" : "bg-black/60"
                }`}
              >
                {f.estado === "error" ? "No se subió" : "Subiendo…"}
              </span>
            )}
            <button
              type="button"
              onClick={() => quitar(f.id)}
              aria-label="Quitar foto"
              className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-sm text-white"
            >
              ×
            </button>
          </div>
        ))}

        {fotos.length < MAXIMO && (
          <label className="grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-stone-400 text-center text-xs text-stone-600">
            <span>
              <span className="block text-2xl leading-none">+</span>
              Agregar
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={elegir}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {fotos.some((f) => f.estado === "error") && (
        <p className="mt-2 text-sm text-red-700">
          Alguna foto no se subió (revisa tu señal). Quítala y vuelve a
          intentarlo; la visita se puede guardar sin ella.
        </p>
      )}
    </div>
  );
}
