import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#06070a",
        panel: "#0d1220",
        line: "#1f2937",
        zinc: {
          950: "#09090b"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 60px rgba(0,0,0,0.40)",
        neon: "0 0 0 1px rgba(34,211,238,0.16), 0 24px 90px rgba(0,0,0,0.48), 0 0 44px rgba(34,211,238,0.10)"
      }
    }
  },
  plugins: []
};

export default config;
