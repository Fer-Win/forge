import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'color-mix(in srgb, var(--bg) calc(<alpha-value> * 100%), transparent)',
        card: 'color-mix(in srgb, var(--card) calc(<alpha-value> * 100%), transparent)',
        'card-2': 'color-mix(in srgb, var(--card-2) calc(<alpha-value> * 100%), transparent)',
        accent: 'color-mix(in srgb, var(--accent) calc(<alpha-value> * 100%), transparent)',
        done: 'color-mix(in srgb, var(--done) calc(<alpha-value> * 100%), transparent)',
        partial: 'color-mix(in srgb, var(--partial) calc(<alpha-value> * 100%), transparent)',
        rest: 'color-mix(in srgb, var(--rest) calc(<alpha-value> * 100%), transparent)',
        fg: 'color-mix(in srgb, var(--fg) calc(<alpha-value> * 100%), transparent)',
        muted: 'color-mix(in srgb, var(--muted) calc(<alpha-value> * 100%), transparent)',
      },
      borderColor: { hair: 'var(--hair)' },
      borderRadius: { card: '18px' },
      fontFamily: { sans: ['var(--font-sans)', 'system-ui', 'sans-serif'] },
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
    },
  },
  plugins: [],
};
export default config;
