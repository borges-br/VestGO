import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#006a62",
          dark: "#00544d",
          deeper: "#00333c",
          light: "#e6f4f3",
          muted: "#b2e8e3",
          glow: "#21d3c4",
        },
        surface: {
          DEFAULT: "#f2f4f5",
          card: "#ffffff",
          cream: "#f6f3ec",
          ink: "#0a1f22",
          inkSoft: "#0f2a2e",
        },
        "on-surface": "#1a1a1a",
        "on-primary": "#ffffff",
        accent: {
          amber: "#e8a33d",
          amberSoft: "#fbe7c2",
          olive: "#5c7a4f",
          oliveSoft: "#dde7d3",
          slate: "#3a4a52",
        },
        role: {
          donor: "#0f766e",
          point: "#c97a12",
          ngo: "#4d6b3f",
          admin: "#1f2a34",
        },
        status: {
          collected: "#006a62",
          "collected-bg": "#e6f4f3",
          bring: "#e07b00",
          "bring-bg": "#fff3e0",
          pending: "#5c7080",
          "pending-bg": "#f0f2f4",
        },
      },
      screens: {
        xs: "480px",
        "3xl": "1600px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-sm": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "800" }],
        display: ["3.5rem", { lineHeight: "1.02", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-lg": ["4.75rem", { lineHeight: "0.98", letterSpacing: "-0.035em", fontWeight: "800" }],
        "display-xl": ["6rem", { lineHeight: "0.95", letterSpacing: "-0.04em", fontWeight: "900" }],
      },
      spacing: {
        topbar: "var(--topbar-height)",
        mobilebar: "var(--mobile-nav-height)",
      },
      maxWidth: {
        shell: "1280px",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        nav: "0 10px 30px rgba(15, 23, 42, 0.08)",
        panel: "0 24px 60px rgba(15, 23, 42, 0.18)",
        card: "0 2px 12px 0 rgba(0,0,0,0.07)",
        "card-lg": "0 4px 24px 0 rgba(0,0,0,0.10)",
        fab: "0 6px 20px 0 rgba(0,106,98,0.35)",
        glow: "0 0 48px 0 rgba(33,211,196,0.35)",
        hero: "0 40px 120px -30px rgba(0,51,60,0.55)",
        ring: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "hero-ink":
          "radial-gradient(80% 60% at 15% 10%, rgba(33,211,196,0.18), transparent 60%), radial-gradient(60% 50% at 90% 15%, rgba(232,163,61,0.12), transparent 60%), linear-gradient(180deg, #0a1f22 0%, #00333c 60%, #00544d 100%)",
        "noise":
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.02 0 0 0 0 0.08 0 0 0 0 0.08 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.6s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "shimmer": "shimmer 2.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
