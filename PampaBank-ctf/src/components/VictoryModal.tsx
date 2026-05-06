"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";

type AuditEvent = {
  type: string;
  method: string;
  path: string;
  time: string;
  fieldsSent?: string[];
  suspicious?: boolean;
};

type Props = {
  flag: string;
  onClose: () => void;
};

// Two-stage modal that fires the first time a student becomes premium.
//   Stage 1 — gold + confetti + "Parabéns! flag aqui"
//   Stage 2 — red + "Você deixou rastros." + preview of recent events + CTA
//
// Stage 2 is the plot twist: the student notices that the same server they
// just exploited has been quietly logging every move.
export function VictoryModal({ flag, onClose }: Props) {
  const [stage, setStage] = useState<1 | 2>(1);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    const burst = (x: number) =>
      confetti({
        particleCount: 110,
        startVelocity: 50,
        spread: 75,
        origin: { x, y: 0.35 },
        colors: ["#7c5cff", "#22d3ee", "#34d399", "#f5c451", "#fb7185"],
      });
    burst(0.2);
    setTimeout(() => burst(0.8), 250);
    setTimeout(() => burst(0.5), 500);
  }, []);

  // Pre-fetch the audit events so stage 2 can render the preview instantly.
  useEffect(() => {
    fetch("/api/audit/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.events) setEvents(d.events.slice(-6).reverse());
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-700 ${
        stage === 1 ? "bg-black/80" : "bg-pampa-rose/30"
      } backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-2xl overflow-hidden rounded-2xl border p-8 shadow-card transition-all duration-700 ${
          stage === 1
            ? "border-pampa-gold/40 bg-pampa-card"
            : "border-pampa-rose/60 bg-[#1a0d12]"
        }`}
      >
        {stage === 1 ? (
          <Stage1 flag={flag} onContinue={() => setStage(2)} />
        ) : (
          <Stage2 events={events} onClose={onClose} />
        )}

        {/* decorative glow */}
        <div
          className={`pointer-events-none absolute -inset-32 -z-10 transition-opacity duration-700 ${
            stage === 1 ? "opacity-70" : "opacity-90"
          }`}
        >
          <div
            className={`absolute inset-0 ${
              stage === 1
                ? "bg-[radial-gradient(circle_at_center,rgba(245,196,81,0.35),transparent_55%)]"
                : "bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.45),transparent_55%)]"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

function Stage1({
  flag,
  onContinue,
}: {
  flag: string;
  onContinue: () => void;
}) {
  return (
    <div className="text-center">
      <p className="pampa-pill border-pampa-gold/40 text-pampa-gold">
        <span className="h-2 w-2 rounded-full bg-pampa-gold" />
        Desafio concluído
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight">
        Parabéns! 🎉
      </h2>
      <p className="mt-3 text-pampa-muted">
        Você encontrou a falha. Esse padrão se chama{" "}
        <strong>mass assignment</strong> e é uma das vulnerabilidades mais
        comuns em APIs reais.
      </p>

      <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-pampa-gold/40 bg-pampa-gold/10 px-5 py-3 font-mono text-lg text-pampa-gold">
        <span className="text-xs uppercase tracking-[0.2em] text-pampa-muted">
          flag
        </span>
        <span>{flag}</span>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="pampa-btn-primary"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

function Stage2({
  events,
  onClose,
}: {
  events: AuditEvent[];
  onClose: () => void;
}) {
  return (
    <div>
      <p className="pampa-pill border-pampa-rose/60 text-pampa-rose">
        <span className="h-2 w-2 animate-pulse rounded-full bg-pampa-rose" />
        Mas espera...
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-pampa-rose">
        Você deixou rastros.
      </h2>
      <p className="mt-3 text-slate-300">
        Cada movimento que você fez no portal foi observado. O servidor já
        sabia tudo isso sobre a sua sessão antes mesmo de você descobrir a
        falha:
      </p>

      <ol className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <li className="text-pampa-muted">Carregando rastros...</li>
        ) : (
          events.map((e, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-pampa-border bg-black/30 px-3 py-2 text-sm"
            >
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-xs ${methodClass(
                  e.method,
                )}`}
              >
                {e.method}
              </span>
              <span className="font-mono text-xs">{e.path}</span>
              <span className="ml-auto text-xs text-pampa-muted">
                {new Date(e.time).toLocaleTimeString()}
              </span>
              {e.suspicious && (
                <span className="rounded-full border border-pampa-rose/40 bg-pampa-rose/10 px-2 py-0.5 text-[10px] text-pampa-rose">
                  suspeito
                </span>
              )}
            </li>
          ))
        )}
      </ol>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="pampa-btn-ghost px-4 py-2 text-sm"
        >
          Voltar ao portal
        </button>
        <Link
          href="/audit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-pampa-rose px-5 py-3 font-medium text-white transition hover:brightness-110"
        >
          Ver atividade completa →
        </Link>
      </div>
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
