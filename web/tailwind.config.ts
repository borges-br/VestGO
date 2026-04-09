import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.{css}",
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
        },
        surface: {
          DEFAULT: "#f2f4f5",
          card: "#ffffff",
        },
        "on-surface": "#1a1a1a",
        "on-primary": "#ffffff",
        status: {
          collected: "#006a62",
          "collected-bg": "#e6f4f3",
          bring: "#e07b00",
          "bring-bg": "#fff3e0",
          pending: "#5c7080",
          "pending-bg": "#f0f2f4",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(0,0,0,0.07)",
        "card-lg": "0 4px 24px 0 rgba(0,0,0,0.10)",
        fab: "0 6px 20px 0 rgba(0,106,98,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;