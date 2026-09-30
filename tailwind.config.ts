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
        background: "#F5F7FA",
        surface: "#FFFFFF",
        primary: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          500: "#4F46E5",
          600: "#4338CA",
          700: "#3730A3",
        },
        auto: {
          brand: "#0F172A", // Dark Slate Blue / Black
          accent: "#2563EB", // Royal Blue
          light: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
        network: {
          brand: "#0369A1", // Cyan / Ocean Blue
          accent: "#0284C7", // Sky Blue
          dark: "#0C4A6E",
          light: "#F0F9FF",
          card: "#FFFFFF",
          border: "#BAE6FD",
        },
        status: {
          draft: "#64748B",
          sent: "#0284C7",
          pending: "#D97706",
          signed: "#059669",
          accepted: "#16A34A",
          paid: "#0D9488",
          overdue: "#DC2626",
          cancelled: "#991B1B",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
