/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brandBlue:  "#0033cc",
        brandDark:  "#001A80",
        brandLight: "#6699FF",
        ayp: {
          50:  "#EEF0FF",
          100: "#C7D0FF",
          500: "#0033CC",
          600: "#0029A8",
          700: "#001A80",
          900: "#000D40",
        },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        display: "-0.03em",
        tight:   "-0.02em",
      },
      borderRadius: {
        card: "20px",
        btn:  "12px",
      },
    },
  },
  plugins: [],
};
