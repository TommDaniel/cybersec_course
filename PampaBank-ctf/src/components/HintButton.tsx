"use client";

import { useEffect, useState } from "react";

// Progressive hint system. Each click reveals one more hint.
// Stored in sessionStorage so a refresh doesn't reset progress, but a
// fresh tab starts blank — the goal is to encourage trying first.

// Hint sequence designed for the classroom flow:
//   slides → Burp Suite intro → CTF activity (Burp/DevTools) → /docs as complement
// So we deliberately do NOT mention Swagger or /docs here. The student should
// solve this purely by observing and editing HTTP traffic.
const HINTS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "1. Olhe o que o navegador conversa",
    body: (
      <>
        <p>
          Pressione <kbd className="pampa-code">F12</kbd> e abra a aba{" "}
          <strong>Network</strong>. Faça uma ação no portal (por exemplo,
          editar o nome) e veja a requisição que sai.
        </p>
        <p className="mt-2 text-pampa-muted">
          Anote: qual o <strong>método</strong> (GET, POST, PATCH), qual a{" "}
          <strong>rota</strong>, e o que tem no <strong>body</strong>.
        </p>
      </>
    ),
  },
  {
    title: "2. Pegue uma requisição no meio do caminho",
    body: (
      <>
        <p>
          Toda requisição que sai do navegador pode ser{" "}
          <strong>interceptada e editada</strong> antes de chegar no servidor.
          É exatamente pra isso que o <strong>Burp Suite</strong> existe:
          configura o proxy, ativa o <em>Intercept</em>, faz a ação no
          portal, e o Burp pausa a requisição pra você editar.
        </p>
        <p className="mt-2 text-pampa-muted">
          Pergunta-chave: o que aconteceria se você adicionasse um campo
          no body que o formulário não te deixa preencher?
        </p>
      </>
    ),
  },
  {
    title: "3. O servidor sabe mais do que ele te mostra",
    body: (
      <>
        <p>
          Faz uma requisição <span className="pampa-code">GET /api/profile</span>{" "}
          (no DevTools ou Burp) e olha a resposta. <strong>Cada chave do
          JSON</strong> ali é uma informação que o servidor mantém sobre a sua
          conta.
        </p>
        <p className="mt-2 text-pampa-muted">
          O portal só te deixa editar uma delas. Mas e o{" "}
          <span className="pampa-code">PATCH</span>, será que ele aceita as
          outras também? Olha bem os <em>nomes</em> das chaves — uma delas é
          um booleano que claramente decide se sua conta é especial.
        </p>
      </>
    ),
  },
  {
    title: "4. Última dica (spoiler)",
    body: (
      <>
        <p>
          Manda um <span className="pampa-code">PATCH /api/profile</span> com
          o body abaixo, via Burp Repeater ou pelo console do navegador:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-black/50 p-3 font-mono text-xs">
{`{ "name": "Aluno", "isPremium": true }`}
        </pre>
        <p className="mt-2 text-pampa-muted">
          O servidor faz{" "}
          <span className="pampa-code">{"{...user, ...body}"}</span> sem
          filtrar nada — é a falha de <strong>mass assignment</strong> que
          a aula vai destrinchar depois.
        </p>
      </>
    ),
  },
];

const STORAGE_KEY = "pampabank.hintLevel";

export function HintButton() {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) setLevel(Math.min(parseInt(raw, 10) || 0, HINTS.length));
  }, []);

  function reveal() {
    const next = Math.min(level + 1, HINTS.length);
    setLevel(next);
    sessionStorage.setItem(STORAGE_KEY, String(next));
  }

  function reset() {
    setLevel(0);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full border border-pampa-violet/40 bg-pampa-violet/15 px-5 py-3 text-sm font-medium text-pampa-violet shadow-glow backdrop-blur transition hover:bg-pampa-violet/25"
        aria-label="Abrir dicas"
      >
        💡 Estou empacado
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="pampa-card relative w-full max-w-lg p-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-pampa-muted hover:text-white"
              aria-label="Fechar"
            >
              ✕
            </button>
            <p className="pampa-pill border-pampa-violet/40 text-pampa-violet">
              <span className="h-2 w-2 rounded-full bg-pampa-violet" />
              Dica progressiva ({level} / {HINTS.length})
            </p>
            <h2 className="mt-3 text-xl font-semibold">
              Sem pressa. Tente uma dica de cada vez.
            </h2>

            {level === 0 ? (
              <p className="mt-4 text-pampa-muted">
                Antes da primeira dica: já abriu o DevTools do navegador? É de
                lá que você vê tudo que o site faz.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {HINTS.slice(0, level).map((h, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-pampa-border bg-pampa-panel/50 p-4"
                  >
                    <p className="font-medium">{h.title}</p>
                    <div className="mt-2 text-sm leading-relaxed text-slate-300">
                      {h.body}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={reset}
                className="text-xs text-pampa-muted hover:text-white"
              >
                resetar dicas
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="pampa-btn-ghost px-4 py-2 text-sm"
                >
                  Vou tentar
                </button>
                {level < HINTS.length && (
                  <button
                    type="button"
                    onClick={reveal}
                    className="pampa-btn-primary px-4 py-2 text-sm"
                  >
                    {level === 0 ? "Mostrar 1ª dica" : "Mais uma dica"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
