/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          canvas: 'var(--bg-canvas)',
          panel: 'var(--bg-panel)',
          elevated: 'var(--bg-elevated)',
          inset: 'var(--bg-inset)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        line: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        accent: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          subtle: 'var(--color-primary-subtle)',
        },
        status: {
          pass: 'var(--status-pass)',
          fail: 'var(--status-fail)',
          warn: 'var(--status-warn)',
        },
        diff: '#ff0055',
      },
    },
  },
  plugins: [],
}
