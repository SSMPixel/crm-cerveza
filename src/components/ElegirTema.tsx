"use client";

import { useState, useSyncExternalStore } from "react";

type Tema = "auto" | "claro" | "oscuro";

const opciones: { valor: Tema; texto: string }[] = [
  { valor: "auto", texto: "Automático" },
  { valor: "claro", texto: "Claro" },
  { valor: "oscuro", texto: "Oscuro" },
];

function leerTema(): Tema {
  const t = document.documentElement.dataset.tema;
  return t === "claro" || t === "oscuro" ? t : "auto";
}

function aplicarTema(t: Tema) {
  const html = document.documentElement;
  if (t === "auto") html.removeAttribute("data-tema");
  else html.setAttribute("data-tema", t);
}

const nadaQueEscuchar = () => () => {};

// Se guarda en este dispositivo (cada celular/compu puede tener el suyo).
export function ElegirTema() {
  const inicial = useSyncExternalStore(nadaQueEscuchar, leerTema, () => "auto");
  const [elegido, setElegido] = useState<Tema | null>(null);
  const actual = elegido ?? inicial;

  function cambiar(t: Tema) {
    setElegido(t);
    try {
      if (t === "auto") localStorage.removeItem("tema");
      else localStorage.setItem("tema", t);
    } catch {}
    aplicarTema(t);
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={actual === o.valor}
          onClick={() => cambiar(o.valor)}
          className={`rounded-md px-2 py-2 text-sm font-medium ${
            actual === o.valor
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600"
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
