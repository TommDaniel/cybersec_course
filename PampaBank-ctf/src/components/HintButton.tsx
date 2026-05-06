"use client";

import { useEffect, useState } from "react";

// Progressive hint system. Each click reveals one more hint.
// Stored in sessionStorage so a refresh doesn't reset progress, but a
// fresh tab starts blank — the goal is to encourage trying first.

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
          Toda interação aqui passa por uma rota tipo{" "}
          <span className="pampa-code">/api/...</span>. Anote o método (GET,
          POST, PATCH) e o caminho.
        </p>
      </>
    ),
  },
  {
    title: "2. Toda API tem um mapa",
    body: (
      <>
        <p>
          Existe uma documentação interativa neste banco. Abra{" "}
          <a href="/docs" className="pampa-link">
            /docs
          </a>{" "}
          em uma nova aba e veja todas as rotas listadas, com os campos que o
          servidor conhece sobre você.
        </p>
        <p className="mt-2 text-pampa-muted">
          Compare: o que o portal envia vs. o que o schema do{" "}
          <span className="pampa-code">Profile</span> aceita.
        </p>
      </>
    ),
  },
  {
    title: "3. Quem manda é o servidor (será?)",
    body: (
      <>
        <p>
          Algumas informações da sua conta deveriam ser controladas{" "}
          <strong>só pelo servidor</strong> — o cliente nunca poderia mexer.
        </p>
        <p className="mt-2 text-pampa-muted">
          E se o servidor estiver confiando em campos que você manda, mesmo
          aqueles que ele não pediu? Olha no schema do perfil em{" "}
          <a href="/docs" className="pampa-link">
            /docs
          </a>{" "}
          quais campos existem.
        </p>
      </>
    ),
  },
  {
    title: "4. Última dica",
    body: (
      <>
        <p>
          Você consegue mandar uma requisição{" "}
          <span className="pampa-code">PATCH /api/profile</span> com mais
          campos do que o portal manda. Pode ser pelo Swagger (botão{" "}
          <em>Try it out</em>) ou pelo console do navegador com{" "}
          <span className="pampa-code">fetch()</span>.
        </p>
        <p className="mt-2 text-pampa-muted">
          O segredo está em incluir um campo do schema{" "}
          <span className="pampa-code">Profile</span> que o portal nunca te
          mostrou um botão pra alterar.
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
