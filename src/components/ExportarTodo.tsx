"use client";

// Descarga toda la información del cliente en un .zip: el libro de cálculo
// y la carpeta de fotos. El .zip se arma aquí, en el navegador, para que las
// fotos no pasen por el servidor (no cabrían en una sola respuesta).
import { useState } from "react";

type Estado =
  | { paso: "listo" }
  | { paso: "hoja" }
  | { paso: "fotos"; hechas: number; total: number }
  | { paso: "empacando" }
  | { paso: "hecho"; faltaron: number }
  | { paso: "error" };

const SIMULTANEAS = 6;

export function ExportarTodo() {
  const [estado, setEstado] = useState<Estado>({ paso: "listo" });
  const ocupado = ["hoja", "fotos", "empacando"].includes(estado.paso);

  async function exportar() {
    if (ocupado) return;
    setEstado({ paso: "hoja" });
    try {
      const [{ default: JSZip }, rHoja, rFotos] = await Promise.all([
        import("jszip"),
        fetch("/exportar/completa?parte=hoja", { cache: "no-store" }),
        fetch("/exportar/completa?parte=fotos", { cache: "no-store" }),
      ]);
      if (!rHoja.ok || !rFotos.ok) throw new Error("servidor");
      const { nombreBase, fotos } = (await rFotos.json()) as {
        nombreBase: string;
        fotos: { archivo: string; url: string | null }[];
      };

      const zip = new JSZip();
      zip.file(`${nombreBase}.xlsx`, await rHoja.blob());

      const faltantes: string[] = [];
      let hechas = 0;
      setEstado({ paso: "fotos", hechas, total: fotos.length });
      const cola = [...fotos];
      async function trabajar() {
        for (let f = cola.shift(); f; f = cola.shift()) {
          try {
            if (!f.url) throw new Error("sin liga");
            const r = await fetch(f.url);
            if (!r.ok) throw new Error(String(r.status));
            zip.file(f.archivo, await r.blob(), { binary: true });
          } catch {
            faltantes.push(f.archivo);
          }
          hechas++;
          setEstado({ paso: "fotos", hechas, total: fotos.length });
        }
      }
      await Promise.all(Array.from({ length: SIMULTANEAS }, trabajar));

      if (faltantes.length)
        zip.file(
          "fotos-que-no-se-pudieron-descargar.txt",
          "Estas fotos no se pudieron descargar. Vuelve a exportar o pide apoyo a Bluepace.\r\n\r\n" +
            faltantes.sort().join("\r\n"),
        );

      setEstado({ paso: "empacando" });
      // Las fotos ya vienen comprimidas: se guardan tal cual para que sea rápido.
      const archivo = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
      });
      const url = URL.createObjectURL(archivo);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nombreBase}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setEstado({ paso: "hecho", faltaron: faltantes.length });
    } catch {
      setEstado({ paso: "error" });
    }
  }

  const texto =
    estado.paso === "hoja"
      ? "Preparando la hoja de cálculo…"
      : estado.paso === "fotos"
        ? `Descargando fotos: ${estado.hechas} de ${estado.total}`
        : estado.paso === "empacando"
          ? "Armando el archivo .zip…"
          : "Descargar toda la información";

  return (
    <div>
      <button
        type="button"
        onClick={exportar}
        disabled={ocupado}
        aria-busy={ocupado}
        className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 active:scale-[0.97] disabled:cursor-wait disabled:opacity-80"
      >
        <svg
          viewBox="0 0 24 24"
          className={`size-4 ${ocupado ? "animate-pulse" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path
            d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {texto}
      </button>
      <p aria-live="polite" className="mt-2 text-sm">
        {estado.paso === "hecho" &&
          (estado.faltaron === 0 ? (
            <span className="text-green-700">Listo. Revisa tus descargas.</span>
          ) : (
            <span className="text-amber-800">
              Listo, pero {estado.faltaron}{" "}
              {estado.faltaron === 1
                ? "foto no se pudo"
                : "fotos no se pudieron"}{" "}
              descargar. La lista va dentro del .zip.
            </span>
          ))}
        {estado.paso === "error" && (
          <span className="text-red-700">
            No se pudo exportar. Revisa tu conexión e inténtalo de nuevo.
          </span>
        )}
        {(estado.paso === "fotos" || estado.paso === "hoja") && (
          <span className="text-stone-600">
            No cierres esta página hasta que termine.
          </span>
        )}
      </p>
    </div>
  );
}
