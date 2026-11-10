import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CRM Cervecero", template: "%s · CRM Cervecero" },
  appleWebApp: { capable: true, title: "CRM", statusBarStyle: "default" },
  description: "Pipeline y visitas del equipo comercial",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#92400e",
  colorScheme: "light dark",
};

const scriptTema = `try{var t=localStorage.getItem("tema");if(t==="claro"||t==="oscuro")document.documentElement.dataset.tema=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Aplica el tema elegido antes de pintar, para que no parpadee. */}
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        {children}
      </body>
    </html>
  );
}
