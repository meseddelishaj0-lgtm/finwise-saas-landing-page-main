import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Display serif — landing-page headlines only
        display: ["var(--font-display)", "Georgia", "serif"],
        // Data mono — commands, tickers, labels
        monodata: ["var(--font-mono-wss)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Hairline default so bare `border` / `divide-y` read correctly on night surfaces
      borderColor: {
        DEFAULT: "rgba(255, 255, 255, 0.10)",
      },
      colors: {
        // Warm paper-white for display text on night (print voice)
        ivory: "#F2EDE3",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",

        "primary-accent": "var(--primary-accent)",
        "foreground-accent": "var(--foreground-accent)",
        "hero-background": "var(--hero-background)",

        // Terminal dark theme: warm near-black bg + raised card surfaces
        night: "#0D0C09",
        surface: "#161410",
        surface2: "#1D1A14",

        // Brand gold scale — the ONLY yellows the site should use.
        // gold = primary accent (== yellow-400), deep for hovers/borders,
        // soft for tints/gradient highlights.
        gold: {
          DEFAULT: "#FACC15",
          deep: "#EAB308",
          soft: "#FDE68A",
          amber: "#FBBF24",
        },
      },
    },
  },
  plugins: [],
};
export default config;
