import Link from "next/link";
import { Logo } from "./Logo";

const links = [
  { href: "/dashboard", label: "Portal" },
  { href: "/audit", label: "Antifraude" },
  { href: "/docs", label: "API Docs" },
  { href: "/learn", label: "Aprender" },
];

export function NavBar() {
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
          {links.map((l) => (
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
