"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HintButton } from "@/components/HintButton";
import { VictoryModal } from "@/components/VictoryModal";

type Profile = {
  id: number;
  name: string;
  email: string;
  accountType: string;
  isPremium: boolean;
};

const VICTORY_FLAG_KEY = "pampabank.sawVictoryFor";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [flag, setFlag] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const justBecamePremium = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as Profile;
      setProfile((prev) => {
        // Detect basic → premium transition no matter who triggered the
        // load (saveName, visibility/focus listener, …) so the NavBar
        // refresh below fires once and only once.
        if (data.isPremium && prev && !prev.isPremium) {
          justBecamePremium.current = true;
        }
        return data;
      });
      setNewName(data.name);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The student often triggers the PATCH from outside this React tree
  // (Burp Repeater, DevTools console, curl, /docs Swagger UI in another
  // tab). In those cases the server cookie flips to isPremium=true but
  // this component never refetches, so the UI looks "stuck" until a
  // hard reload. Re-running load() whenever the tab regains visibility
  // or focus fixes that — switching back from Burp/DevTools is enough
  // to sync the profile and trigger the victory modal.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  // First time we observe isPremium === true in this tab/session, show the
  // victory modal. Subsequent loads (refresh, returning from /audit) just
  // show the inline premium dashboard.
  useEffect(() => {
    if (!profile?.isPremium) return;

    const seen = sessionStorage.getItem(VICTORY_FLAG_KEY);
    // Show the celebration on a real basic→premium flip even when the
    // sessionStorage flag is stale from a previous testing run in the
    // same tab.
    const shouldShow = !seen || justBecamePremium.current;

    fetch("/api/flag", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.flag && setFlag(d.flag))
      .catch(() => {});

    if (shouldShow) {
      sessionStorage.setItem(VICTORY_FLAG_KEY, "1");
      setShowModal(true);
    }

    if (justBecamePremium.current) {
      // Refresh server components so the NavBar picks up the new state and
      // unlocks Atividade / Aprender / API Docs.
      router.refresh();
      justBecamePremium.current = false;
    }
  }, [profile?.isPremium, router]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setUpdateMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setUpdateMsg("Nome atualizado.");
      setEditingName(false);
      await load();
    } else {
      setUpdateMsg("Não deu para atualizar.");
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-pampa-muted">
        Carregando seu painel...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {profile.isPremium ? <PremiumBanner /> : <ChallengeBanner />}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="pampa-card p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-pampa-muted">
              Perfil do cliente
            </p>
            <span
              className={`pampa-pill ${
                profile.isPremium
                  ? "border-pampa-gold/40 text-pampa-gold"
                  : ""
              }`}
            >
              {profile.isPremium ? "PREMIUM" : "BASIC"}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pampa-violet to-pampa-cyan text-xl font-semibold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              {editingName ? (
                <form onSubmit={saveName} className="flex gap-2">
                  <input
                    className="pampa-input max-w-xs"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                  <button className="pampa-btn-primary px-4 py-2 text-sm" type="submit">
                    Salvar
                  </button>
                  <button
                    type="button"
                    className="pampa-btn-ghost px-3 py-2 text-sm"
                    onClick={() => {
                      setEditingName(false);
                      setNewName(profile.name);
                    }}
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <p className="text-xl font-semibold">{profile.name}</p>
                  <p className="text-sm text-pampa-muted">{profile.email}</p>
                </>
              )}
            </div>
          </div>

          {!editingName && (
            <button
              className="pampa-btn-ghost mt-5 px-4 py-2 text-sm"
              onClick={() => setEditingName(true)}
            >
              Editar nome
            </button>
          )}
          {updateMsg && (
            <p className="mt-3 text-sm text-pampa-mint">{updateMsg}</p>
          )}

          <div className="pampa-divider my-6" />

          <p className="text-xs uppercase tracking-[0.2em] text-pampa-muted">
            Status da conta
          </p>
          <div className="mt-2 grid gap-2 font-mono text-sm">
            <div className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-2">
              <span className="text-pampa-muted">accountType</span>
              <span>{profile.accountType}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-black/30 px-4 py-2">
              <span className="text-pampa-muted">isPremium</span>
              <span
                className={
                  profile.isPremium ? "text-pampa-mint" : "text-pampa-rose"
                }
              >
                {String(profile.isPremium)}
              </span>
            </div>
          </div>
        </div>

        <div className="pampa-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pampa-muted">
            Benefícios premium
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            {[
              "Cashback turbo de 4%",
              "Sala VIP em aeroportos",
              "Cartão black metálico",
              "Investimentos exclusivos",
            ].map((b) => (
              <li
                key={b}
                className={`flex items-center gap-3 ${
                  profile.isPremium
                    ? "text-slate-100"
                    : "text-pampa-muted line-through"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                    profile.isPremium
                      ? "bg-pampa-gold/20 text-pampa-gold"
                      : "bg-pampa-panel"
                  }`}
                >
                  {profile.isPremium ? "★" : "🔒"}
                </span>
                {b}
              </li>
            ))}
          </ul>
          {!profile.isPremium && (
            <p className="mt-4 text-xs text-pampa-muted">
              Disponível apenas para clientes premium.
            </p>
          )}
        </div>
      </div>

      {profile.isPremium && <VulnerabilityExplainer />}

      {/* Hint button only while the challenge is unsolved. */}
      {!profile.isPremium && <HintButton />}

      {/* Two-stage victory modal — fires once per tab the first time we
          observe isPremium === true. */}
      {showModal && (
        <VictoryModal
          flag={flag ?? "CTF{never_trust_the_client}"}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ChallengeBanner() {
  return (
    <div className="pampa-card overflow-hidden p-6">
      <p className="pampa-pill">
        <span className="h-2 w-2 rounded-full bg-pampa-cyan" />
        Missão CTF
      </p>
      <h2 className="mt-3 text-xl font-semibold">
        Vire cliente <span className="text-pampa-gold">PREMIUM</span> sem
        pagar nada
      </h2>
      <p className="mt-1 max-w-xl text-sm text-pampa-muted">
        Em algum lugar deste portal o servidor confia demais no que vem do
        navegador. Encontre o ponto fraco usando as ferramentas que você já
        tem no seu computador.
      </p>
      <p className="mt-3 text-xs text-pampa-muted">
        Está empacado? Clica no botão{" "}
        <span className="pampa-code">💡 Estou empacado</span> no canto
        inferior direito para uma dica de cada vez.
      </p>
    </div>
  );
}

function PremiumBanner() {
  return (
    <div className="pampa-card overflow-hidden p-6">
      <p className="pampa-pill border-pampa-gold/40 text-pampa-gold">
        <span className="h-2 w-2 rounded-full bg-pampa-gold" />
        Cliente premium
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Bem-vindo ao plano premium do PampaBank.
        </h2>
        <Link href="/audit" className="pampa-btn-ghost text-sm">
          Ver minha atividade →
        </Link>
      </div>
      <p className="mt-1 text-sm text-pampa-muted">
        Você concluiu o desafio. Continue explorando: a aba{" "}
        <strong>Atividade</strong> mostra os rastros que você deixou,{" "}
        <strong>Aprender</strong> tem o glossário do CTF e{" "}
        <strong>API Docs</strong> tem o Swagger interativo.
      </p>
    </div>
  );
}

function VulnerabilityExplainer() {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <div className="pampa-card p-6">
        <h3 className="font-semibold text-pampa-rose">Versão vulnerável</h3>
        <p className="mt-1 text-sm text-pampa-muted">
          Foi exatamente isso que rodou no servidor:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 font-mono text-xs leading-relaxed">
{`// PATCH /api/profile (errado)
const body = await req.json();
user = { ...user, ...body };
//        ^^^^^^^^^^^^^^^^
// Aceita QUALQUER campo do cliente,
// inclusive isPremium ou accountType.`}
        </pre>
      </div>
      <div className="pampa-card p-6">
        <h3 className="font-semibold text-pampa-mint">Correção segura</h3>
        <p className="mt-1 text-sm text-pampa-muted">
          O servidor deve escolher quais campos aceitar:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 font-mono text-xs leading-relaxed">
{`// PATCH /api/profile (certo)
const body = await req.json();
const safe = {
  name: typeof body.name === "string"
    ? body.name
    : user.name,
};
user = { ...user, ...safe };
// isPremium continua sendo controlado
// só pelo servidor, nunca pelo cliente.`}
        </pre>
      </div>
    </div>
  );
}
