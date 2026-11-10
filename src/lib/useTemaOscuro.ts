"use client";

import { useSyncExternalStore } from "react";

// ¿La app se está viendo en oscuro? Respeta la elección de Mi perfil
// y, si es "Automático", la del dispositivo. Se actualiza en vivo.
const consulta = "(prefers-color-scheme: dark)";

function esOscuro() {
  const t = document.documentElement.getAttribute("data-tema");
  if (t === "oscuro") return true;
  if (t === "claro") return false;
  return window.matchMedia(consulta).matches;
}

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(consulta);
  mq.addEventListener("change", avisar);
  const obs = new MutationObserver(avisar);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-tema"],
  });
  return () => {
    mq.removeEventListener("change", avisar);
    obs.disconnect();
  };
}

export function useTemaOscuro() {
  return useSyncExternalStore(suscribir, esOscuro, () => false);
}
