"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuditEvent = {
  type: string;
  method: string;
  path: string;
  time: string;
  fieldsSent?: string[];
  suspicious?: boolean;
  note?: string;
};

type AuditPayload = {
  sessionId: string;
  riskScore: number;
  summary: {
    totalRequests: number;
    suspiciousEvents: number;
    sensitiveFieldsTouched: string[];
  };
  clientHints: {
    userAgent: string;
    language: string;
    ipApprox: string;
    referer: string;
    origin: string;
  };
  events: AuditEvent[];
};

export default function AuditPage() {
  const [data, setData] = useState<AuditPayload | null>(null);

  useEffect(() => {
    fetch("/api/audit/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-pampa-muted">
        Carregando rastros da sessão...
      </div>
    );
  }

  const { browser, os } = parseUserAgent(data.clientHints.userAgent);
  const riskColor =
    data.riskScore >= 70
      ? "text-pampa-rose"
      : data.riskScore >= 40
      ? "text-pampa-gold"
      : "text-pampa-mint";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header>
        <p className="pampa-pill border-pampa-rose/40 text-pampa-rose">
          <span className="h-2 w-2 animate-pulse rounded-full bg-pampa-rose" />
          Central Antifraude · sandbox
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Você venceu o desafio — mas suas ações deixaram rastros no servidor.
        </h1>
        <p className="mt-2 max-w-3xl text-pampa-muted">
          Tudo que você ver aqui é informação que <strong>qualquer servidor HTTP</strong> já
          recebe naturalmente em cada requisição. Não usamos fingerprinting, não
          olhamos sua localização precisa e nenhum dado sai desta sessão.
        </p>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card title="Score de risco" subtitle="(fictício, didático)">
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-semibold ${riskColor}`}>
              {data.riskScore}
            </span>
            <span className="pb-2 text-sm text-pampa-muted">/ 100</span>
          </div>
          <p className="mt-2 text-xs text-pampa-muted">
            Bancos reais misturam centenas de sinais para gerar números parecidos
            com este — comportamento, dispositivo, geografia, histórico.
          </p>
        </Card>

        <Card title="Resumo da sessão">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-pampa-muted">Total de requisições</span>
              <span className="font-mono">{data.summary.totalRequests}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-pampa-muted">Eventos suspeitos</span>
              <span className="font-mono text-pampa-rose">
                {data.summary.suspiciousEvents}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-pampa-muted">Sessão</span>
              <span className="font-mono text-xs">{data.sessionId}</span>
            </li>
          </ul>
        </Card>

        <Card title="Campos sensíveis alterados">
          {data.summary.sensitiveFieldsTouched.length === 0 ? (
            <p className="text-sm text-pampa-muted">Nenhum até agora.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {data.summary.sensitiveFieldsTouched.map((f) => (
                <li
                  key={f}
                  className="rounded-full border border-pampa-rose/30 bg-pampa-rose/10 px-3 py-1 font-mono text-xs text-pampa-rose"
                >
                  {f}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-pampa-muted">
            Esses são campos que o servidor sabe que <em>nunca deveriam</em>{" "}
            chegar diretamente do cliente.
          </p>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <HintCard label="Navegador detectado" value={browser} />
        <HintCard label="Sistema (aprox.)" value={os} />
        <HintCard label="Idioma do navegador" value={data.clientHints.language || "—"} />
        <HintCard
          label="IP aproximado"
          value={data.clientHints.ipApprox}
          hint="Último octeto mascarado de propósito."
        />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="User-Agent enviado">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/40 p-3 font-mono text-xs">
            {data.clientHints.userAgent || "—"}
          </pre>
        </Card>
        <Card title="Origem das requisições">
          <ul className="space-y-2 text-sm">
            <li>
              <span className="text-pampa-muted">referer: </span>
              <span className="font-mono break-all">
                {data.clientHints.referer || "—"}
              </span>
            </li>
            <li>
              <span className="text-pampa-muted">origin: </span>
              <span className="font-mono break-all">
                {data.clientHints.origin || "—"}
              </span>
            </li>
          </ul>
        </Card>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Linha do tempo da sua sessão</h2>
          <span className="text-xs text-pampa-muted">
            {data.events.length} eventos
          </span>
        </div>

        <ol className="relative space-y-4 border-l border-pampa-border pl-6">
          {data.events.map((e, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[31px] top-1.5 grid h-4 w-4 place-items-center rounded-full ring-4 ring-pampa-bg ${
                  e.suspicious ? "bg-pampa-rose" : "bg-pampa-cyan"
                }`}
              />
              <div className="pampa-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-xs ${methodClass(
                        e.method,
                      )}`}
                    >
                      {e.method}
                    </span>
                    <span className="font-mono text-sm">{e.path}</span>
                    <span className="pampa-pill">{e.type}</span>
                    {e.suspicious && (
                      <span className="rounded-full border border-pampa-rose/40 bg-pampa-rose/10 px-2 py-0.5 text-xs text-pampa-rose">
                        suspeito
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-pampa-muted">
                    {new Date(e.time).toLocaleTimeString()}
                  </time>
                </div>
                {e.fieldsSent && e.fieldsSent.length > 0 && (
                  <p className="mt-2 text-xs text-pampa-muted">
                    Campos enviados:{" "}
                    {e.fieldsSent.map((f) => (
                      <span key={f} className="pampa-code mr-1">
                        {f}
                      </span>
                    ))}
                  </p>
                )}
                {e.note && (
                  <p className="mt-1 text-xs text-pampa-muted">↳ {e.note}</p>
                )}
              </div>
            </li>
          ))}
          {data.events.length === 0 && (
            <li className="text-pampa-muted">Sem eventos registrados ainda.</li>
          )}
        </ol>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="pampa-card p-6">
          <h3 className="font-semibold text-pampa-mint">Para que servem esses logs?</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>• Detectar fraude, abuso e ataques em tempo quase real.</li>
            <li>• Investigar incidentes depois que algo acontece.</li>
            <li>• Treinar modelos de risco e antifraude.</li>
            <li>• Cumprir auditorias e exigências regulatórias.</li>
          </ul>
        </div>
        <div className="pampa-card p-6">
          <h3 className="font-semibold text-pampa-cyan">E o seu lado?</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>• Empresas devem coletar só o necessário (minimização).</li>
            <li>• Logs precisam de transparência: você tem direito de saber o que é guardado.</li>
            <li>• Dados sensíveis exigem proteção, retenção curta e acesso restrito.</li>
            <li>• Esconder rastros não é o objetivo — entender e usar a internet com consciência é.</li>
          </ul>
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-pampa-violet/40 bg-gradient-to-r from-pampa-violet/15 to-pampa-cyan/15 p-6 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-pampa-muted">
          Flag final
        </p>
        <p className="mt-2 font-mono text-2xl text-pampa-cyan">
          CTF{`{you_left_traces}`}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/learn" className="pampa-btn-ghost">
            Ler as explicações
          </Link>
          <Link href="/dashboard" className="pampa-btn-primary">
            Voltar ao portal
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pampa-card p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-pampa-muted">
        {title}
        {subtitle && (
          <span className="ml-1 normal-case tracking-normal opacity-70">
            {subtitle}
          </span>
        )}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function HintCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="pampa-card p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-pampa-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-sm break-words">{value}</p>
      {hint && <p className="mt-2 text-xs text-pampa-muted">{hint}</p>}
    </div>
  );
}

function methodClass(method: string) {
  switch (method) {
    case "GET":
      return "bg-pampa-cyan/15 text-pampa-cyan";
    case "POST":
      return "bg-pampa-mint/15 text-pampa-mint";
    case "PATCH":
    case "PUT":
      return "bg-pampa-gold/15 text-pampa-gold";
    case "DELETE":
      return "bg-pampa-rose/15 text-pampa-rose";
    default:
      return "bg-pampa-panel text-slate-300";
  }
}

// Tiny, intentionally rough UA parser. Real apps use a library, but the goal
// here is to show that even simple string matching reveals a lot about you.
function parseUserAgent(ua: string): { browser: string; os: string } {
  const lower = (ua || "").toLowerCase();
  let browser = "desconhecido";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("chrome") && !lower.includes("chromium")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari")) browser = "Safari";

  let os = "desconhecido";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("mac os")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  return { browser, os };
}
