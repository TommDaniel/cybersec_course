import Link from "next/link";
import { Logo } from "./Logo";
import { readState } from "@/lib/state";

// Server component: reads the signed cookie state on each request and
// decides which nav items the student is allowed to see.
//
// Pre-victory: only the logo + Início (so the student has to *do* the CTF
// instead of clicking around the menu reading hints).
//
// Post-victory: unlocks Atividade, Aprender and API Docs — the material
// that explains what just happened.
export async function NavBar() {
  const state = await readState();
  const isPremium = state.user.isPremium;

  const unlockedLinks = [
    { href: "/audit", label: "Atividade" },
    { href: "/learn", label: "Aprender" },
    { href: "/docs", label: "API Docs" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-pampa-border/60 bg-pampa-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">PampaBank</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-pampa-muted">
              CTF · Treinamento
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-pampa-panel/70 hover:text-white"
          >
            Início
          </Link>
          {isPremium &&
            unlockedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-pampa-panel/70 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
