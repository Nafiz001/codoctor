import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm cream paper + warm dark ink
        paper: "#FBF7F0",
        ink: {
          DEFAULT: "#2A2320",
          soft: "#483E37",
          muted: "#6E625A",
          faint: "#A99C8F",
        },
        // Brand — warm clay / terracotta (replaces the old teal)
        brand: {
          50: "#FAF1EB",
          100: "#F3DECF",
          200: "#E6BB9F",
          300: "#D89870",
          400: "#C9774A",
          500: "#B85C38",
          600: "#9F4E2E",
          700: "#813F27",
          800: "#6A3422",
          900: "#572C1E",
          950: "#3A1D14",
        },
        // Override the cool greys with a WARM neutral scale so the whole app
        // (cards, borders, muted text) reads warm without touching every file.
        slate: {
          50: "#FAF7F2",
          100: "#F2ECE3",
          200: "#E6DCCF",
          300: "#D4C7B5",
          400: "#B3A491",
          500: "#8C7E6D",
          600: "#6E6253",
          700: "#564C40",
          800: "#3B3329",
          900: "#2A2320",
          950: "#1C1813",
        },
        // Success / calm — warm sage (overrides emerald usages app-wide)
        emerald: {
          50: "#EEF3F0",
          100: "#D9E5DE",
          200: "#B6CDC0",
          300: "#8FB1A0",
          400: "#6E9684",
          500: "#57796B",
          600: "#466356",
          700: "#3A5247",
          800: "#30453B",
          900: "#28392F",
        },
        // Danger — warm brick red (overrides red usages app-wide)
        red: {
          50: "#FBEDEA",
          100: "#F6D9D2",
          200: "#EBB3A6",
          300: "#DD8B79",
          400: "#CE6450",
          500: "#C0392B",
          600: "#A52E22",
          700: "#87271E",
          800: "#6B231C",
          900: "#5A2019",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        bangla: ["var(--font-bangla)", "var(--font-hanken)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(42,35,32,.05), 0 8px 24px -16px rgba(42,35,32,.20)",
        card: "0 1px 2px rgba(42,35,32,.05), 0 20px 44px -28px rgba(120,70,40,.30)",
        glow: "0 1px 2px rgba(42,35,32,.06), 0 10px 30px -14px rgba(184,92,56,.40)",
      },
      borderRadius: {
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(14px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "80%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.2,.7,.2,1) both",
        "fade-in": "fade-in .5s ease-out both",
        "slide-in": "slide-in .5s cubic-bezier(.2,.7,.2,1) both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(.2,.7,.2,1) infinite",
        blink: "blink 1.4s ease-in-out infinite",
        wave: "wave 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
