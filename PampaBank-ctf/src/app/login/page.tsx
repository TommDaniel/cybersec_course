"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("aluno@pampabank.ctf");
  const [password, setPassword] = useState("ctf123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error ?? "Falha no login.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="pampa-card p-8">
        <p className="pampa-pill">
          <span className="h-2 w-2 rounded-full bg-pampa-cyan" />
          Portal do cliente
        </p>
        <h1 className="mt-4 text-2xl font-semibold">Entrar no PampaBank</h1>
        <p className="mt-1 text-sm text-pampa-muted">
          Use as credenciais de demonstração abaixo. Nada disso é real.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="pampa-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="pampa-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="pampa-label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              className="pampa-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-pampa-rose/40 bg-pampa-rose/10 p-3 text-sm text-pampa-rose">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="pampa-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="pampa-divider my-6" />

        <div className="rounded-xl border border-pampa-border bg-pampa-panel/40 p-4 text-sm text-slate-300">
          <p className="font-medium">Credenciais de demonstração</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            <li>
              email: <span className="pampa-code">aluno@pampabank.ctf</span>
            </li>
            <li>
              senha: <span className="pampa-code">ctf123</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-pampa-muted">
            Dica: abra o DevTools antes de clicar em "Entrar" para ver a
            requisição POST /api/login.
          </p>
        </div>
      </div>
    </div>
  );
}
