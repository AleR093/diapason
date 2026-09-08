/**
 * Cart state: a localStorage list of rich line items (captured at add-time,
 * so the drawer never needs to re-fetch products) plus a change event that
 * the header counters, the drawer and the WhatsApp checkout all subscribe to.
 * There is still no real checkout — the purchase closes on WhatsApp.
 */
const KEY = 'diapason:cart';
const EVENT = 'diapason:cart-change';
const OPEN_EVENT = 'diapason:open-cart';

export interface CartLine {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  qty: number;
}

function isCartLine(l: unknown): l is CartLine {
  if (!l || typeof l !== 'object') return false;
  const line = l as Record<string, unknown>;
  return (
    typeof line.id === 'string' &&
    typeof line.slug === 'string' &&
    typeof line.name === 'string' &&
    typeof line.price === 'number' &&
    typeof line.image === 'string' &&
    typeof line.qty === 'number'
  );
}

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLine);
  } catch {
    return [];
  }
}

function write(lines: CartLine[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable (private mode, blocked) — cart just stays empty */
  }
  window.dispatchEvent(new CustomEvent<CartLine[]>(EVENT, { detail: lines }));
}

export function getCart(): CartLine[] {
  return read();
}

export function count(): number {
  return read().reduce((n, l) => n + l.qty, 0);
}

export function total(): number {
  return read().reduce((n, l) => n + l.qty * l.price, 0);
}

export function addToCart(item: Omit<CartLine, 'qty'>, qty = 1): void {
  const lines = read();
  const existing = lines.find((l) => l.id === item.id);
  if (existing) existing.qty += qty;
  else lines.push({ ...item, qty });
  write(lines);
}

export function updateQty(id: string, qty: number): void {
  const lines = read();
  if (qty <= 0) {
    write(lines.filter((l) => l.id !== id));
    return;
  }
  const line = lines.find((l) => l.id === id);
  if (line) line.qty = qty;
  write(lines);
}

export function removeFromCart(id: string): void {
  write(read().filter((l) => l.id !== id));
}

export function clearCart(): void {
  write([]);
}

/** Returns an unsubscribe function — see onAuthChange() in auth.ts for why callers should use it. */
export function onCartChange(handler: (lines: CartLine[]) => void): () => void {
  const listener = ((e: CustomEvent<CartLine[]>) => handler(e.detail)) as EventListener;
  const storageListener = (e: StorageEvent) => {
    if (e.key === KEY) handler(read());
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', storageListener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', storageListener);
  };
}

export function openCartDrawer(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

/** Returns an unsubscribe function — see onAuthChange() in auth.ts for why callers should use it. */
export function onOpenCartRequest(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

/** Keeps every [data-cart-count] badge on the page in sync. */
function syncCounters(): void {
  const n = count();
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => {
    el.textContent = String(n);
    el.dataset.empty = n === 0 ? 'true' : 'false';
  });
}

/**
 * Delegated click handler: works for [data-add-to-cart] buttons that exist
 * on load AND for ones rendered later by a live catalog/search fetch — no
 * need to re-wire after every render.
 */
function wireAddToCartDelegation(): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest<HTMLElement>('[data-add-to-cart]');
    if (!btn) return;
    const raw = btn.dataset.addToCart;
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as Omit<CartLine, 'qty'>;
      if (!item.id || !item.slug) return;
      addToCart(item);
    } catch {
      return;
    }
    const label = btn.querySelector('[data-add-label]');
    if (label) {
      const prev = label.textContent;
      label.textContent = 'Añadido';
      window.setTimeout(() => {
        label.textContent = prev;
      }, 1400);
    }
  });
}

export function initCart(): void {
  wireAddToCartDelegation();
  onCartChange(syncCounters);
  syncCounters();
  // The header badge lives in Nav.astro, wholesale-replaced by every view
  // transition — resync it against the freshly-swapped-in element each time.
  document.addEventListener('astro:page-load', syncCounters);
}

if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') initCart();
  else document.addEventListener('DOMContentLoaded', initCart);
}
