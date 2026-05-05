import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "PampaBank CTF",
  description:
    "PampaBank — CTF educacional sobre HTTP, Swagger, Burp Suite e rastros digitais. Ambiente fictício.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-pampa-border/60 bg-pampa-panel/40">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-pampa-muted md:flex-row md:items-center md:justify-between">
              <p>
                © PampaBank — banco fictício usado apenas para fins educacionais.
              </p>
              <p className="text-xs">
                Não use técnicas aprendidas aqui contra sistemas que você não
                tem permissão para testar.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
