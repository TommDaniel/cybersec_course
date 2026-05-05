import Link from "next/link";

const features = [
  {
    title: "HTTP de verdade",
    body: "Você vai abrir o DevTools e ver requisições reais, com headers, métodos e códigos de status.",
  },
  {
    title: "Swagger guiado",
    body: "Toda a API tem documentação interativa em /docs. Dá para testar tudo direto do navegador.",
  },
  {
    title: "Burp opcional",
    body: "Quem quiser ir além pode interceptar e editar as requisições com o Burp Suite.",
  },
  {
    title: "Rastros explicados",
    body: "No final, mostramos exatamente o que ficou registrado das suas próprias requisições.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="pampa-pill">
            <span className="h-2 w-2 rounded-full bg-pampa-mint" />
            Ambiente fictício e educacional
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            PampaBank{" "}
            <span className="bg-gradient-to-r from-pampa-violet to-pampa-cyan bg-clip-text text-transparent">
              CTF
            </span>
            <br />
            <span className="text-2xl text-pampa-muted md:text-3xl">
              Você deixou rastros.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-slate-300">
            Um treinamento estilo <strong>Capture The Flag</strong> para você
            aprender HTTP, APIs, Swagger e Burp Suite explorando uma falha real
            de segurança em um banco de mentirinha.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="pampa-btn-primary">
              Entrar no Portal →
            </Link>
            <Link href="/learn" className="pampa-btn-ghost">
              Nunca ouvi falar de HTTP
            </Link>
          </div>
          <p className="mt-6 text-sm text-pampa-muted">
            ⚠️ PampaBank não existe. Nenhum dado real é usado, armazenado ou
            transmitido para terceiros. O objetivo é só te ensinar a olhar para
            o que normalmente fica invisível.
          </p>
        </div>

        <div className="relative">
          <div className="pampa-card overflow-hidden p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-pampa-muted">
                Saldo disponível
              </p>
              <span className="pampa-pill">FAKE</span>
            </div>
            <p className="mt-2 font-mono text-3xl">R$ 12.948,<span className="text-pampa-muted">52</span></p>
            <p className="mt-1 text-sm text-pampa-muted">
              ag. 0001 · cc. 13371-3 · titular: <em>Aluno CTF</em>
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              {["Pix", "Cartão", "Investir"].map((t) => (
                <div
                  key={t}
                  className="rounded-xl border border-pampa-border bg-pampa-panel/70 py-3"
                >
                  {t}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-pampa-border bg-black/30 p-4 font-mono text-xs leading-relaxed text-slate-300">
              <p className="text-pampa-muted">// console</p>
              <p>
                <span className="text-pampa-cyan">GET</span> /api/profile
              </p>
              <p className="text-pampa-mint">200 OK</p>
              <p>
                {`{ "isPremium": `}
                <span className="text-pampa-rose">false</span>
                {` }`}
              </p>
            </div>
          </div>

          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-pampa-violet/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pampa-cyan/20 blur-3xl" />
        </div>
      </section>

      <section className="grid gap-4 pb-20 md:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="pampa-card p-5">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-pampa-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
