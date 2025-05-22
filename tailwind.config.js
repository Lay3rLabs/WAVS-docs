import { createPreset, presets } from "fumadocs-ui/tailwind-plugin";

const contentPaths = [
  "./components/**/*.{ts,tsx}",
  "./app/**/*.{ts,tsx}",
  "./node_modules/fumadocs-ui/dist/**/*.js",
  "./node_modules/fumadocs-openapi/dist/**/*.js",
];

// Conditionally include the MDX path only in production
if (process.env.NODE_ENV === "production") {
  contentPaths.push("./content/**/*.{mdx,tsx}");
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: contentPaths, // Use content instead of purge in v3
  presets: [
    createPreset({
      addGlobalColors: true,
      preset: {
        ...presets.default,
        dark: {
          ...presets.default.dark,
          background: "0 0% 2%",
          foreground: "0 0% 98%",
          popover: "0 0% 4%",
          card: "0 0% 4%",
          muted: "0 0% 8%",
          border: "0 0% 14%",
          accent: "0 0% 15%",
          "accent-foreground": "0 0% 100%",
          "muted-foreground": "0 0% 60%",
        },
      },
    }),
  ],
  plugins: [require("@tailwindcss/typography")],
  theme: {
    extend: {
      colors: {
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsla(var(--text-body))",
        background: "hsla(var(--background-base))",
        primary: {
          DEFAULT: "hsl(var(--background-primary), 0.08)",
          foreground: "hsla(var(--text-primary))",
          body: "hsla(var(--text-body))",
        },
        secondary: {
          DEFAULT: "hsla(var(--background-secondary))",
          foreground: "hsla(var(--text-secondary))",
        },
        tertiary: {
          DEFAULT: "hsla(var(--tertiary))",
          foreground: "hsla(var(--tertiary-foreground))",
          background: "hsla(var(--tertiary-background))",
        },
        destructive: {
          DEFAULT: "hsla(var(--destructive))",
          foreground: "hsla(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsla(var(--background-tertiary))",
          foreground: "hsla(var(--text-tertiary))",
        },
        accent: {
          DEFAULT: "hsla(var(--background-accent))",
          foreground: "hsla(var(--text-accent))",
        },
        popover: {
          DEFAULT: "hsla(var(--popover))",
          foreground: "hsla(var(--popover-foreground))",
        },
        card: {
          // DEFAULT: "hsl(var(--card))",
          DEFAULT: "hsla(var(--background-tertiary))",
          foreground: "hsla(var(--text-body))",
        },
        border: {
          DEFAULT: "hsl(var(--border-secondary))",
          primary: "hsl(var(--border-primary))",
          secondary: "hsl(var(--border-secondary))",
        },
      },
    },
  },
};