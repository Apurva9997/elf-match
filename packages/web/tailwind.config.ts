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
        // Deep, rich backgrounds
        midnight: {
          DEFAULT: "#0F1419",
          50: "#1A2332",
          100: "#232D3F",
          200: "#2D3A4F",
          300: "#3D4B5F",
        },
        // Warm accent colors
        gold: {
          DEFAULT: "#D4A853",
          light: "#E8C97A",
          dark: "#B87333",
        },
        copper: "#B87333",
        cream: "#FFF8E7",
        // Supporting colors
        success: "#4ADE80",
        warning: "#FBBF24",
        error: "#F87171",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-gold": "linear-gradient(135deg, #D4A853 0%, #B87333 100%)",
        "gradient-card": "linear-gradient(135deg, #1A2332 0%, #232D3F 100%)",
        "gradient-glow":
          "radial-gradient(ellipse at center, rgba(212, 168, 83, 0.15) 0%, transparent 70%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(212, 168, 83, 0.15)",
        "glow-lg": "0 0 60px rgba(212, 168, 83, 0.2)",
        card: "0 4px 24px rgba(0, 0, 0, 0.3)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        snow: "snow 10s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        snow: {
          "0%": { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
