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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        {children}
      </body>
    </html>
  );
}
