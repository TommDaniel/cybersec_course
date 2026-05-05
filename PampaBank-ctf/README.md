# PampaBank CTF — Você deixou rastros

> CTF educacional para adolescentes (16+) aprenderem **HTTP**, **Swagger**, **Burp Suite** e **rastros digitais**, em um banco fictício chamado **PampaBank**.

⚠️ **Tudo aqui é fictício.** PampaBank não existe. Nenhum dado real é coletado, transmitido ou armazenado. O laboratório roda em memória e reseta a cada redeploy.

---

## 🎯 Missão do CTF

O aluno entra no portal como cliente `basic`. Em algum lugar, o backend confia demais no JSON enviado pelo cliente. Ao descobrir isso e enviar o campo certo, o aluno vira `premium` e recebe a flag.

- **Flag 1 (vulnerabilidade)**: `CTF{never_trust_the_client}`
- **Flag 2 (rastros)**: `CTF{you_left_traces}`

A segunda flag aparece automaticamente em `/audit` depois que a primeira é capturada — o plot twist mostra que, no caminho até a vitória, o aluno deixou um rastro detalhado nas próprias requisições.

---

## 🧰 Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** para o tema fintech
- **swagger-ui-react** para a UI interativa em `/docs`
- **canvas-confetti** para o efeito de vitória
- **Sem banco de dados.** Sessão em cookie, estado em memória (`globalThis`)
- Deploy alvo: **Vercel** (mas roda em qualquer host Node 20+)

---

## 🚀 Como rodar localmente

```bash
# 1. instalar dependências
npm install

# 2. rodar em dev
npm run dev
# → http://localhost:3000
```

Outras tasks úteis:

```bash
npm run build   # build de produção
npm run start   # subir o build em produção
npm run lint    # lint do Next
```

---

## ☁️ Como fazer deploy na Vercel

1. Suba o projeto para um repositório do GitHub/GitLab/Bitbucket.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. A Vercel detecta o Next.js automaticamente. **Não precisa de variáveis de ambiente.**
4. Clique em **Deploy**. Pronto.

> Como o estado é em memória, cada *cold start* da serverless function pode reiniciar a sessão. Isso é proposital — o CTF é curto e cabe em uma sessão. Se quiser persistência, adicione um KV/Redis depois.

Alternativa local: `npm run build && npm run start`.

---

## 📜 Endpoints (e como usar o Swagger)

A documentação interativa fica em **`/docs`**. Lá dentro você pode:

1. Expandir um endpoint
2. Clicar em **Try it out**
3. Editar o body de exemplo
4. Clicar em **Execute** e ver o resultado

| Método | Rota              | Descrição                                                                 |
| ------ | ----------------- | ------------------------------------------------------------------------- |
| POST   | `/api/login`      | Login fictício (`aluno@pampabank.ctf` / `ctf123`)                       |
| GET    | `/api/profile`    | Retorna o perfil atual da sessão                                          |
| PATCH  | `/api/profile`    | **Vulnerável de propósito** — aceita qualquer campo do body               |
| GET    | `/api/flag`       | Devolve a flag se `isPremium === true`, senão 403                         |
| GET    | `/api/audit/me`   | Resumo dos rastros da sessão (eventos, hints, score de risco)             |
| GET    | `/api/openapi`    | Spec OpenAPI 3 consumida pelo Swagger UI                                  |

---

## 🕵️ Caminhos para resolver o desafio

Existem três formas didáticas e equivalentes. Escolha a que mais te ensina.

### 1. DevTools (sem ferramentas extras)

1. Abra `/dashboard`, abra o DevTools → aba **Network**.
2. Clique em "Editar nome", troque para qualquer coisa e salve. Veja a requisição `PATCH /api/profile`.
3. Clique com botão direito → **Copy as fetch** (ou edite o request).
4. Cole no console e adicione um campo no body:
   ```js
   fetch("/api/profile", {
     method: "PATCH",
     headers: { "content-type": "application/json" },
     body: JSON.stringify({ name: "Aluno", isPremium: true }),
   }).then((r) => r.json()).then(console.log);
   ```
5. Atualize a página e veja o painel virar **PREMIUM**.

### 2. Swagger UI (`/docs`)

1. Vá em `/docs`.
2. Expanda **PATCH /api/profile**.
3. Em **Try it out**, mude o exemplo para:
   ```json
   { "name": "Aluno PampaBank", "isPremium": true }
   ```
4. Clique em **Execute** e volte para `/dashboard`.

### 3. Burp Suite (caminho avançado)

1. Configure o navegador para usar o proxy do Burp (`127.0.0.1:8080`) ou use o **Burp Browser** embutido.
2. Habilite **Intercept**.
3. No `/dashboard`, salve uma alteração de nome.
4. Quando o Burp pegar o `PATCH /api/profile`, edite o body para incluir `"isPremium": true`.
5. **Forward** a requisição e veja o painel reconhecer você como premium.

---

## 💥 A falha: mass assignment

No backend, o handler do `PATCH /api/profile` faz literalmente isto:

```ts
// 🚨 vulnerável de propósito
const body = await req.json();
session.user = { ...session.user, ...body };
```

Esse padrão é traiçoeiro porque "funciona" para o caso bom (`{ name: "..." }`), mas aceita silenciosamente qualquer campo do schema do usuário. Se o cliente mandar `isPremium: true`, o servidor obedece.

### ✅ Como corrigir

Liste explicitamente o que pode ser alterado pelo cliente:

```ts
const body = await req.json();
const safe = {
  name: typeof body.name === "string" ? body.name : session.user.name,
};
session.user = { ...session.user, ...safe };
// isPremium / accountType / id / email continuam controlados só pelo servidor.
```

Outras boas práticas equivalentes:
- Definir um **DTO de entrada** validado (Zod, Yup, Valibot...) e jogar fora qualquer campo desconhecido.
- Usar uma **allowlist** explícita: `const allowed = ["name"]`.
- Nunca usar **spread** do body do cliente em cima de objetos sensíveis.

---

## 🪞 Rastros digitais — o plot twist

Depois da vitória, a página **`/audit`** ("Central Antifraude") mostra os metadados que o servidor já tinha de você o tempo todo:

- Método e rota de cada requisição, com horário
- User-Agent, idioma do navegador
- IP aproximado (último octeto mascarado)
- `referer` e `origin`
- Campos enviados no body, com destaque para os sensíveis (`isPremium`, `accountType`, ...)
- Score de risco fictício e linha do tempo dos eventos

A ideia é mostrar, sem fingerprinting nem geolocalização, que **qualquer servidor HTTP comum já tem material suficiente para identificar comportamento atípico**.

Empresas usam logs assim para:

- Detectar fraude e abuso em tempo quase real.
- Investigar incidentes depois que algo dá errado.
- Treinar modelos de risco antifraude.
- Cumprir auditorias e regulação.

E em troca, devem respeitar:

- **Minimização**: coletar só o necessário.
- **Transparência**: deixar claro o que é coletado.
- **Retenção curta** e acesso restrito.
- **Direitos do usuário** (LGPD/GDPR): consulta, correção, exclusão.

---

## 🔒 O que este projeto **não** faz (de propósito)

- Não usa nome de banco real.
- Não armazena senhas reais.
- Não usa geolocalização do navegador.
- Não faz fingerprinting (canvas, fonts, audio).
- Não escaneia outros sites/serviços.
- Não executa comandos do sistema operacional.
- Não ensina evasão, anonimização ofensiva ou como esconder rastros.

O foco é **conscientização defensiva** — entender como APIs são atacadas para saber como protegê-las (e como se proteger como cliente).

---

## ⚖️ Aviso ético

Este laboratório foi feito para ser quebrado. **Sistemas reais não.** Aplique o que aprendeu apenas em:

- Ambientes que são seus.
- Programas oficiais de bug bounty (HackerOne, BugCrowd, Intigriti, etc.).
- Plataformas declaradamente educacionais (Hack The Box, TryHackMe, PortSwigger Academy).
- CTFs públicos com escopo claro.

Testar serviços de terceiros sem autorização é crime em praticamente todo lugar do mundo, inclusive no Brasil (Lei 12.737/2012, Lei Geral de Proteção de Dados, Marco Civil da Internet).

---

## 📁 Estrutura

```
src/
  app/
    api/
      audit/me/route.ts      # GET resumo de rastros
      flag/route.ts          # GET flag (premium-only)
      login/route.ts         # POST login fictício
      openapi/route.ts       # GET spec OpenAPI
      profile/route.ts       # GET / PATCH (vulnerável)
    audit/page.tsx           # Central Antifraude
    dashboard/page.tsx       # Portal do cliente + vitória
    docs/page.tsx            # Swagger UI
    layout.tsx               # Shell com NavBar + footer
    learn/page.tsx           # Glossário do CTF
    login/page.tsx           # Login com credenciais visíveis
    page.tsx                 # Landing page
    globals.css              # Tema fintech
  components/
    Logo.tsx
    NavBar.tsx
  lib/
    audit.ts                 # extração de hints + logEvent
    openapi.ts               # spec OpenAPI 3
    session.ts               # cookie pampabank_session
    store.ts                 # estado em memória + risk score
```

Bom desafio. E quando terminar, lembre-se da segunda flag: **CTF{you_left_traces}**.
