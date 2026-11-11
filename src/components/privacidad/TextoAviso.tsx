// Muestra un aviso escrito en texto simple: títulos en MAYÚSCULAS,
// viñetas con "- " y listas con "1. ".
export function TextoAviso({ texto }: { texto: string }) {
  const lineas = texto.split("\n");
  const bloques: React.ReactNode[] = [];
  let lista: { tipo: "ul" | "ol"; items: string[] } | null = null;
  const cerrarLista = () => {
    if (!lista) return;
    const Etiqueta = lista.tipo;
    bloques.push(
      <Etiqueta
        key={bloques.length}
        className={`my-2 space-y-1 pl-5 ${lista.tipo === "ul" ? "list-disc" : "list-decimal"}`}
      >
        {lista.items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </Etiqueta>,
    );
    lista = null;
  };

  lineas.forEach((cruda, i) => {
    const l = cruda.trim();
    const vineta = l.match(/^- (.*)/);
    const numero = l.match(/^\d+\. (.*)/);
    if (vineta || numero) {
      const tipo = vineta ? "ul" : "ol";
      if (lista && lista.tipo !== tipo) cerrarLista();
      lista ??= { tipo, items: [] };
      lista.items.push((vineta ?? numero)![1]);
      return;
    }
    cerrarLista();
    if (!l) return;
    const esTitulo =
      l.length < 60 &&
      l === l.toLocaleUpperCase("es-MX") &&
      /[A-ZÁÉÍÓÚÑ]/.test(l);
    bloques.push(
      i === 0 ? (
        <h2 key={bloques.length} className="text-lg font-semibold">
          {l}
        </h2>
      ) : esTitulo ? (
        <h3
          key={bloques.length}
          className="mt-4 text-sm font-semibold tracking-wide text-stone-700"
        >
          {l.charAt(0) + l.slice(1).toLocaleLowerCase("es-MX")}
        </h3>
      ) : (
        <p key={bloques.length} className="my-2">
          {l}
        </p>
      ),
    );
  });
  cerrarLista();
  return (
    <div className="text-sm leading-relaxed text-stone-800">{bloques}</div>
  );
}
