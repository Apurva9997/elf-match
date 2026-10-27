import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#F6F1E7",
          deep: "#EBE4D6",
          card: "#FFFCF6",
        },
        evergreen: {
          DEFAULT: "#1E3A32",
          deep: "#142822",
          mid: "#2C5246",
          soft: "#E4EDE8",
        },
        cranberry: {
          DEFAULT: "#8E3A42",
          deep: "#6E2A32",
          soft: "#F3E4E2",
        },
        ink: {
          DEFAULT: "#1C1915",
          soft: "#5C564C",
          faint: "#8A8276",
        },
        rule: "#DDD4C4",
        // Legacy aliases so authenticated screens keep compiling
        // while public pages move to the paper palette.
        midnight: {
          DEFAULT: "#142822",
          50: "#1E3A32",
          100: "#2C5246",
          200: "#3D6558",
          300: "#52786A",
        },
        gold: {
          DEFAULT: "#8E3A42",
          light: "#A85A60",
          dark: "#6E2A32",
        },
        copper: "#6E2A32",
        cream: "#F6F1E7",
        success: "#2F6B4F",
        warning: "#8A6232",
        error: "#8E3A42",
      },
      fontFamily: {
        display: ["Fraunces", "Iowan Old Style", "Palatino", "serif"],
        sans: ["Source Sans 3", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        paper: "0 1px 0 rgba(28, 25, 21, 0.04), 0 18px 40px -28px rgba(28, 25, 21, 0.45)",
        tag: "0 10px 24px -16px rgba(28, 25, 21, 0.4)",
      },
      maxWidth: {
        page: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
