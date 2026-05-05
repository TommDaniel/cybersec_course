"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Swagger UI usa APIs do navegador, então carregamos só no client.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

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
          direto desta página clicando em <em>Try it out</em>. Existe{" "}
          <strong>uma falha proposital</strong> — leia as descrições com calma.
        </p>
      </header>
      <div className="pampa-card overflow-hidden">
        <SwaggerUI url="/api/openapi" docExpansion="list" defaultModelsExpandDepth={-1} />
      </div>
    </div>
  );
}
