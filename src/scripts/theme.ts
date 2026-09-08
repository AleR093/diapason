/**
 * Modo Noche state: persisted in localStorage, applied as a `dark` class on
 * <html> (see tailwind.config.mjs `darkMode: 'class'` + the CSS variables in
 * global.css). The actual FIRST paint is handled by a separate inline,
 * blocking <script is:inline> in Base.astro's <head> — that one runs before
 * any CSS applies, so there is no flash of the wrong theme; this module only
 * has to keep things in sync afterwards (the toggle button, repeat visits).
 */
const KEY = 'diapason:theme';
const EVENT = 'diapason:theme-change';

export type Theme = 'light' | 'dark';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable — fall through to the system preference */
  }
  return systemPrefersDark() ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode / storage blocked — theme just won't persist across visits */
  }
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Returns an unsubscribe function — see onAuthChange() in auth.ts for why callers should use it. */
export function onThemeChange(handler: (theme: Theme) => void): () => void {
  const listener = ((e: CustomEvent<Theme>) => handler(e.detail)) as EventListener;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Keeps every [data-theme-toggle] button's a11y state in sync — the sun/moon icon swap itself is pure CSS. */
function syncToggleButtons(theme: Theme): void {
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
    btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo noche');
  });
}

/** Delegated click: works for the toggle rendered in Nav.astro on every page/navigation. */
function wireToggleDelegation(): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest<HTMLElement>('[data-theme-toggle]');
    if (!btn) return;
    toggleTheme();
  });
}

export function initTheme(): void {
  wireToggleDelegation();
  onThemeChange(syncToggleButtons);
  syncToggleButtons(getTheme());
  // Nav is shared layout markup, replaced wholesale by view transitions on
  // every navigation — resync the freshly-rendered toggle button each time.
  document.addEventListener('astro:page-load', () => syncToggleButtons(getTheme()));
}

if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') initTheme();
  else document.addEventListener('DOMContentLoaded', initTheme);
}
