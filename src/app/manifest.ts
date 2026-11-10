import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio": la app abre a pantalla completa,
// sin barra del navegador, con su ícono y su nombre.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRM Cervecero",
    short_name: "CRM",
    description: "Pipeline y visitas del equipo comercial",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#92400e",
    lang: "es-MX",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icono-512-mascara.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
