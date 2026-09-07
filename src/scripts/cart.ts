/**
 * Visual-only cart: a localStorage list of {slug, qty} plus a header counter.
 * No checkout in this delivery — the real purchase path is WhatsApp.
 */
const KEY = 'diapason:cart';
const EVENT = 'diapason:cart-change';

export interface CartLine {
  slug: string;
  qty: number;
}

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine => l && typeof l.slug === 'string' && typeof l.qty === 'number',
    );
  } catch {
    return [];
  }
}

function write(lines: CartLine[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable (private mode, blocked) — counter just stays at 0 */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { count: count() } }));
}

export function count(): number {
  return read().reduce((n, l) => n + l.qty, 0);
}

export function addToCart(slug: string, qty = 1): void {
  const lines = read();
  const existing = lines.find((l) => l.slug === slug);
  if (existing) existing.qty += qty;
  else lines.push({ slug, qty });
  write(lines);
}

export function onCartChange(handler: (count: number) => void): void {
  window.addEventListener(EVENT, () => handler(count()));
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) handler(count());
  });
}

/** Wire every [data-add-to-cart] button on the page + keep counters in sync. */
export function initCart(): void {
  const sync = () => {
    const n = count();
    document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => {
      el.textContent = String(n);
      el.dataset.empty = n === 0 ? 'true' : 'false';
    });
  };

  document.querySelectorAll<HTMLButtonElement>('[data-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slug = btn.dataset.addToCart;
      if (!slug) return;
      addToCart(slug);
      const label = btn.querySelector('[data-add-label]');
      if (label) {
        const prev = label.textContent;
        label.textContent = 'Añadido';
        window.setTimeout(() => {
          label.textContent = prev;
        }, 1400);
      }
    });
  });

  onCartChange(sync);
  sync();
}

if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') initCart();
  else document.addEventListener('DOMContentLoaded', initCart);
}
