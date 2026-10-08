import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#faf9f5",
          100: "#f4f4f0",
          200: "#ddc1b2",
        },
        mint: {
          50: "#eef8e9",
          100: "#dff5d7",
          200: "#b9eeab",
          500: "#5c9a50",
          600: "#3c6934",
          700: "#24501e",
        },
        cocoa: {
          500: "#755841",
          700: "#564337",
          900: "#1b1c1a",
        },
        thaiTea: {
          50: "#fff3ea",
          100: "#ffdbc8",
          200: "#ffb68b",
          500: "#e87722",
          600: "#994700",
          700: "#743400",
        },
        rice: {
          50: "#ffffff",
          100: "#efeeea",
          200: "#e3e2df",
        },
      },
      boxShadow: {
        soft: "0 8px 24px rgba(79, 34, 0, 0.08)",
        press: "0 3px 0 rgba(79, 34, 0, 0.24)",
      },
      fontFamily: {
        sans: [
          "Sarabun",
          "Noto Sans Thai",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "Noto Serif Thai",
          "Sarabun",
          "ui-serif",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
