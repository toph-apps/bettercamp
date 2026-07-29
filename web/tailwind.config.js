/** @type {import('tailwindcss').Config} */
function withOpacity(varName) {
  return `rgb(from var(${varName}) r g b / <alpha-value>)`;
}

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: withOpacity("--bg"),
        surface: withOpacity("--surface"),
        "surface-2": withOpacity("--surface-2"),
        ink: withOpacity("--ink"),
        "ink-2": withOpacity("--ink-2"),
        "ink-3": withOpacity("--ink-3"),
        rule: withOpacity("--rule"),
        moss: withOpacity("--moss"),
        "moss-fg": withOpacity("--moss-fg"),
        lake: withOpacity("--lake"),
        trail: withOpacity("--trail"),
        warn: withOpacity("--warn"),
        "ramp-1": withOpacity("--ramp-1"),
        "ramp-2": withOpacity("--ramp-2"),
        "ramp-3": withOpacity("--ramp-3"),
        "ramp-4": withOpacity("--ramp-4"),
        "ramp-5": withOpacity("--ramp-5"),
      },
      fontFamily: {
        serif: ["Source Serif 4 Variable", "ui-serif", "Georgia", "serif"],
        sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      fontSize: {
        hero: ["1.75rem", { lineHeight: "1.25", letterSpacing: "0" }],
      },
    },
  },
  plugins: [],
};
