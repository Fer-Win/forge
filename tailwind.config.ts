import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        'card-2': 'var(--card-2)',
        accent: 'var(--accent)',
        done: 'var(--done)',
        partial: 'var(--partial)',
        rest: 'var(--rest)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
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
