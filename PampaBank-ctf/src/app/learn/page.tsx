import Link from "next/link";
import { redirect } from "next/navigation";
import { readState } from "@/lib/state";

const topics = [
  {
    id: "http",
    title: "O que é HTTP?",
    body: (
      <>
        <p>
          Toda vez que você abre um site, seu navegador faz uma{" "}
          <strong>requisição HTTP</strong>: ele pergunta algo ao servidor e
          espera uma resposta. É como mandar mensagem em um app de chat — só
          que com regras bem definidas.
        </p>
        <p>
          Cada requisição tem um <strong>método</strong>:{" "}
          <span className="pampa-code">GET</span> para pedir,{" "}
          <span className="pampa-code">POST</span> para enviar,{" "}
          <span className="pampa-code">PATCH</span> para atualizar parte de
          algo, <span className="pampa-code">DELETE</span> para apagar.
        </p>
      </>
    ),
  },
  {
    id: "headers",
    title: "O que são headers?",
    body: (
      <>
        <p>
          Headers são <strong>informações extras</strong> que viajam junto com
          cada requisição. Eles dizem coisas como qual navegador você está
          usando, qual idioma você prefere e qual o tipo do conteúdo enviado.
        </p>
        <p>
          Você não precisa configurar nada — eles vão automaticamente. Por isso
          são tão úteis para servidores entenderem quem está do outro lado.
        </p>
      </>
    ),
  },
  {
    id: "user-agent",
    title: "O que é User-Agent?",
    body: (
      <>
        <p>
          O <strong>User-Agent</strong> é um header que descreve o seu navegador
          e o sistema operacional. Algo como:
        </p>
        <pre className="rounded-xl bg-black/40 p-3 font-mono text-xs">
{`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
(KHTML, like Gecko) Chrome/124.0 Safari/537.36`}
        </pre>
        <p>
          Sozinho ele já diz se você está no Windows, Mac, Android, Linux,
          iPhone — e qual navegador. É um dos rastros mais simples de coletar.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "O que é IP?",
    body: (
      <>
        <p>
          Um <strong>IP</strong> é como o endereço da sua casa na internet. Ele
          identifica de onde a sua requisição está saindo. Bancos e serviços
          usam isso para detectar logins fora do comum.
        </p>
        <p>
          Aqui no CTF, mostramos só uma <strong>aproximação</strong> do seu IP,
          com o último número escondido. Ninguém precisa do IP completo para
          entender a ideia.
        </p>
      </>
    ),
  },
  {
    id: "json",
    title: "O que é JSON?",
    body: (
      <>
        <p>
          <strong>JSON</strong> é um formato de texto para representar dados.
          Ele se parece muito com objetos de JavaScript:
        </p>
        <pre className="rounded-xl bg-black/40 p-3 font-mono text-xs">
{`{
  "name": "Aluno CTF",
  "isPremium": false
}`}
        </pre>
        <p>
          APIs usam JSON o tempo todo para receber e devolver dados.
        </p>
      </>
    ),
  },
  {
    id: "swagger",
    title: "O que é Swagger?",
    body: (
      <>
        <p>
          <strong>Swagger</strong> (ou OpenAPI) é uma forma de descrever uma
          API: quais endpoints existem, o que cada um recebe, o que devolve.
        </p>
        <p>
          Quando uma empresa publica um Swagger, ela está literalmente dizendo{" "}
          <em>"olha o mapa da minha API"</em>. Para um aluno de CTF, é o melhor
          ponto de partida — você sempre olha o Swagger antes de tentar
          qualquer coisa.
        </p>
        <p>
          Veja o nosso em{" "}
          <Link href="/docs" className="pampa-link">
            /docs
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "burp",
    title: "O que é Burp Suite?",
    body: (
      <>
        <p>
          O <strong>Burp Suite</strong> é uma ferramenta usada por
          profissionais de segurança para <strong>interceptar</strong>{" "}
          requisições entre o navegador e o servidor. Você pode pausar uma
          requisição, mudar o que ela envia e só então deixar ela seguir.
        </p>
        <p>
          Para este desafio você não precisa do Burp — o DevTools ou o Swagger
          já bastam. Mas se você quiser praticar, é uma das ferramentas mais
          importantes da carreira.
        </p>
        <p className="text-xs text-pampa-muted">
          Importante: só use o Burp em sistemas que são seus, em laboratórios
          como este, ou em programas oficiais de bug bounty. Interceptar tráfego
          alheio sem autorização é crime.
        </p>
      </>
    ),
  },
  {
    id: "mass-assignment",
    title: "O que é mass assignment?",
    body: (
      <>
        <p>
          É quando o servidor pega o JSON que o cliente mandou e simplesmente
          faz <span className="pampa-code">user = {`{ ...user, ...body }`}</span>{" "}
          sem filtrar nada. Aí o cliente pode injetar campos que ele não
          deveria mexer — como{" "}
          <span className="pampa-code">isPremium</span> ou{" "}
          <span className="pampa-code">role</span>.
        </p>
        <p className="text-pampa-mint">
          Correção: o servidor deve listar quais campos aceita. Algo como{" "}
          <span className="pampa-code">{`{ name: body.name }`}</span>. Tudo
          que não estiver nessa lista é descartado.
        </p>
      </>
    ),
  },
  {
    id: "logs",
    title: "O que são logs?",
    body: (
      <>
        <p>
          Logs são o <strong>diário do servidor</strong>: cada requisição vira
          uma linha registrada com hora, rota, método, código de resposta e
          algumas pistas sobre quem fez. É assim que empresas detectam ataques,
          investigam fraudes e melhoram seus sistemas.
        </p>
        <p>
          Bons logs respeitam <strong>privacidade</strong>: registram só o
          necessário, com retenção curta e acesso restrito. Logs ruins guardam
          muito mais do que precisariam.
        </p>
      </>
    ),
  },
  {
    id: "why",
    title: "Por que empresas registram eventos de segurança?",
    body: (
      <>
        <p>
          Para <strong>te proteger</strong> e proteger a si mesmas. Quando
          alguém tenta logar 100 vezes na sua conta, o sistema percebe pelo
          padrão de eventos — e pode bloquear preventivamente.
        </p>
        <p>
          Quando um vazamento acontece, são os logs que ajudam a entender por
          onde o ataque entrou e o que ele tocou. Sem logs, ninguém aprende
          nada com incidentes.
        </p>
      </>
    ),
  },
];

// Server-side gate: the glossary is the post-victory reference.
// Anyone who hasn't completed the challenge gets sent back to the dashboard
// to try first — the hint button there gives them just enough nudges.
export default async function LearnPage() {
  const state = await readState();
  if (!state.user.isPremium) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <p className="pampa-pill">
          <span className="h-2 w-2 rounded-full bg-pampa-mint" />
          Glossário do CTF
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Os conceitos por trás do desafio
        </h1>
        <p className="mt-2 text-pampa-muted">
          Tudo aqui é em linguagem simples. Se você está começando agora, leia
          na ordem. Se já manja, pule direto para a parte que te interessa.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {topics.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="pampa-pill hover:border-pampa-cyan/40 hover:text-pampa-cyan"
          >
            {t.title}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-8">
        {topics.map((t) => (
          <section key={t.id} id={t.id} className="pampa-card p-6 scroll-mt-24">
            <h2 className="text-xl font-semibold">{t.title}</h2>
            <div className="prose prose-invert mt-3 max-w-none space-y-3 text-slate-300 [&_p]:leading-relaxed">
              {t.body}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-pampa-violet/30 bg-pampa-violet/10 p-6 text-sm">
        <p className="font-semibold text-pampa-violet">⚖️ Aviso ético</p>
        <p className="mt-2 text-slate-300">
          As ideias deste laboratório só podem ser aplicadas em sistemas que
          você é dono ou em programas com autorização explícita (CTFs, bug
          bounties, ambientes de treino). Testar serviços alheios sem permissão
          é ilegal — e o objetivo aqui é fazer você se tornar um cliente mais
          atento e, quem sabe, um profissional de segurança no futuro.
        </p>
      </div>
    </div>
  );
}
