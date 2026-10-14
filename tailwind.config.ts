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
        background: "#0B1120", // Deep midnight navy
        surface: {
          DEFAULT: "#131d33", // Dark card surface
          subtle: "#1a233b",  // Elevated charcoal
          muted: "#0f172a",   // Deep charcoal
          border: "#334155",  // Slate border
        },
        forest: {
          50: "#F0F5F2",
          100: "#DDEBE2",
          200: "#BDDAC8",
          300: "#94C1A5",
          400: "#63A17E",
          500: "#3D825F",
          600: "#2B684B",
          700: "#20513A",
          800: "#1A412F",
          900: "#153426",
          950: "#0C1F16",
        },
        amber: {
          warm: "#D97706",
          subtle: "#F59E0B",
          light: "#FEF3C7",
          dark: "#B45309",
        },
        slate: {
          850: "#172033",
        }
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
