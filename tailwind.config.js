/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware surface tokens — use these everywhere
        'th-base':    'var(--bg-base)',
        'th-surface': 'var(--bg-surface)',
        'th-sidebar': 'var(--bg-sidebar)',
        'th-input':   'var(--bg-input)',
        'th-hover':   'var(--bg-hover)',
        'th-border':  'var(--border)',
        'th-muted':   'var(--text-muted)',
      },
    },
  },
  plugins: [],
};
