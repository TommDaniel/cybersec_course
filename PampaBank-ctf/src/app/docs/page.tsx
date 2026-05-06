"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Swagger UI usa APIs do navegador, então carregamos só no client.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

const methods = [
  {
    name: "GET",
    color: "bg-pampa-cyan/15 text-pampa-cyan border-pampa-cyan/40",
    body: "Pedir informação. O servidor lê e devolve. Não muda nada.",
  },
  {
    name: "POST",
    color: "bg-pampa-mint/15 text-pampa-mint border-pampa-mint/40",
    body: "Enviar algo novo. Tipo \"crie esta conta\" ou \"faça este login\".",
  },
  {
    name: "PATCH",
    color: "bg-pampa-gold/15 text-pampa-gold border-pampa-gold/40",
    body: "Atualizar parte de algo que já existe. Você manda só os campos a mudar.",
  },
  {
    name: "DELETE",
    color: "bg-pampa-rose/15 text-pampa-rose border-pampa-rose/40",
    body: "Apagar. Não usamos aqui — só ficou no glossário.",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <p className="pampa-pill">
          <span className="h-2 w-2 rounded-full bg-pampa-cyan" />
          Documentação interativa
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          API do PampaBank — Swagger
        </h1>
        <p className="mt-2 max-w-3xl text-pampa-muted">
          Tudo que o app faz passa por estes endpoints. Você pode testá-los
          direto desta página clicando em <em>Try it out</em>.
        </p>
      </header>

      <section aria-label="Lembrete de métodos HTTP" className="mb-6 grid gap-3 md:grid-cols-4">
        {methods.map((m) => (
          <div
            key={m.name}
            className={`rounded-xl border p-4 ${m.color}`}
          >
            <p className="font-mono text-sm font-semibold">{m.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-200/90">
              {m.body}
            </p>
          </div>
        ))}
      </section>

      <div className="pampa-card overflow-hidden">
        <SwaggerUI
          url="/api/openapi"
          docExpansion="list"
          defaultModelsExpandDepth={-1}
        />
      </div>
    </div>
  );
}
