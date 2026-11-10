import { ligaWhatsApp } from "@/lib/contacto";

type Manager = { nombre: string; correo: string; telefono: string | null };

// Botones para mandarle al manager un mensaje ya redactado, por WhatsApp o correo.
export function AvisarManager({
  managers,
  mensaje,
  asunto,
  compacto = false,
}: {
  managers: Manager[];
  mensaje: string;
  asunto: string;
  compacto?: boolean;
}) {
  if (managers.length === 0) {
    return (
      <p className="text-xs text-stone-500">
        Este cliente no tiene manager registrado.
      </p>
    );
  }
  const m = managers[0];
  const saludo = mensaje.replace(/^Hola,/, `Hola ${m.nombre},`);
  const whatsapp = ligaWhatsApp(m.telefono, saludo);
  const correo = `mailto:${m.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(saludo)}`;
  const estilo = compacto
    ? "rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700"
    : "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800";

  return (
    <div className="flex flex-wrap gap-2">
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={estilo}
        >
          WhatsApp a {m.nombre}
        </a>
      ) : (
        <span
          className={`${estilo} border-dashed text-stone-400`}
          title="Agrega el teléfono del manager para usar WhatsApp"
        >
          WhatsApp (sin teléfono)
        </span>
      )}
      <a href={correo} className={estilo}>
        Correo
      </a>
    </div>
  );
}
