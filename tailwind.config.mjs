/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette named for lutherie materials — see src/styles/global.css for usage notes.
        // bone/paper/ink/walnut/line-paper are FIXED on purpose: they're always paired inside
        // sections designed as permanent "dark islands" (MarqueeBar, ReviewTicker, Footer, the
        // index.astro editorial + CTA bands) or as controls sitting on a photo (Hero, card
        // badges) — those must not flip when Modo Noche toggles, or their contrast breaks.
        bone: '#F1ECE0', // page background (bone nut / piano key) — fixed
        paper: '#FBF9F4', // lifted surfaces on a fixed-dark section, or as text on one — fixed
        ink: '#1A1714', // the fixed dark mass: solid bands, badges, controls on photos — fixed
        walnut: '#43342A', // dark editorial band + footer — fixed
        'line-paper': 'rgba(251,249,244,0.24)', // hairlines on a fixed-dark section — fixed

        // Reactive tokens — CSS-var backed (see :root / :root.dark in global.css). These
        // drive every generic, theme-aware surface: page canvas, buttons, chips, dialogs.
        surface: 'var(--c-surface)', // page canvas background
        'surface-raised': 'var(--c-surface-raised)', // opaque panel: modals, dropdowns, mobile menu
        'surface-glass': 'var(--c-surface-glass)', // translucent chrome: nav bar, dock, theme toggle
        content: 'var(--c-content)', // primary text — the inverse of `surface`
        felt: 'var(--c-felt)', // muted tile/chip background (piano hammer felt)
        brass: 'var(--c-brass)', // non-text accent only: focus ring, status dot
        'brass-ink': 'var(--c-brass-ink)', // brass when used as text (>= 4.5:1 on its surface)
        line: 'var(--c-line)', // hairline rules / borders
        'line-strong': 'var(--c-line-strong)',
      },
      fontFamily: {
        // Archivo = headings + all UI. Newsreader = long-form prose only.
        sans: ['"Archivo Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
      },
      maxWidth: {
        shell: '1280px',
        measure: '64ch',
      },
      letterSpacing: {
        wordmark: '0.38em',
        button: '0.08em',
        tight2: '-0.015em',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
