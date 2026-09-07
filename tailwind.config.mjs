/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette named for lutherie materials — see src/styles/global.css for usage notes.
        bone: '#F1ECE0', // page background (bone nut / piano key)
        paper: '#FBF9F4', // lifted surfaces: nav panel, cards on bone
        felt: '#E4DDCE', // product image tiles, muted panels, chips (piano hammer felt)
        ink: '#1A1714', // primary text, solid buttons (warm ebony near-black)
        walnut: '#43342A', // dark editorial band + footer
        brass: '#A9782F', // non-text accent only: focus ring, status dot
        'brass-ink': '#7A5518', // brass when used as text (>= 4.5:1 on bone/paper)
        line: 'rgba(26,23,20,0.14)', // hairline rules / borders
        'line-strong': 'rgba(26,23,20,0.28)',
        'line-paper': 'rgba(251,249,244,0.24)', // hairlines on dark backgrounds
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
