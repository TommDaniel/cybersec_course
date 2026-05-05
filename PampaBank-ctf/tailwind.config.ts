import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pampa: {
          bg: "#070b14",
          panel: "#0f1626",
          card: "#131c30",
          border: "#1f2a44",
          violet: "#7c5cff",
          cyan: "#22d3ee",
          mint: "#34d399",
          gold: "#f5c451",
          rose: "#fb7185",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 60px rgba(124, 92, 255, 0.25)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "pampa-grad":
          "radial-gradient(ellipse at top left, rgba(124,92,255,0.18), transparent 50%), radial-gradient(ellipse at bottom right, rgba(34,211,238,0.12), transparent 55%), linear-gradient(180deg, #070b14 0%, #050810 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
