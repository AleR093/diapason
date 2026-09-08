/**
 * Wishlist state: a localStorage list of saved products, mirroring cart.ts's
 * shape/pattern exactly (read/write/event/delegation) — no account needed,
 * so it works the same for a signed-in shopper or a guest.
 */
const KEY = 'diapason:wishlist';
const EVENT = 'diapason:wishlist-change';

export interface WishlistItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
}

function isWishlistItem(x: unknown): x is WishlistItem {
  if (!x || typeof x !== 'object') return false;
  const w = x as Record<string, unknown>;
  return (
    typeof w.id === 'string' &&
    typeof w.slug === 'string' &&
    typeof w.name === 'string' &&
    typeof w.price === 'number' &&
    typeof w.image === 'string'
  );
}

function read(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWishlistItem);
  } catch {
    return [];
  }
}

function write(items: WishlistItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable (private mode, blocked) — wishlist just stays empty */
  }
  window.dispatchEvent(new CustomEvent<WishlistItem[]>(EVENT, { detail: items }));
}

export function getWishlist(): WishlistItem[] {
  return read();
}

export function isWishlisted(id: string): boolean {
  return read().some((w) => w.id === id);
}

/** Adds or removes the item; returns the new saved state (true = now saved). */
export function toggleWishlist(item: WishlistItem): boolean {
  const items = read();
  const idx = items.findIndex((w) => w.id === item.id);
  if (idx >= 0) {
    items.splice(idx, 1);
    write(items);
    return false;
  }
  items.push(item);
  write(items);
  return true;
}

export function removeFromWishlist(id: string): void {
  write(read().filter((w) => w.id !== id));
}

/** Returns an unsubscribe function — see onAuthChange() in auth.ts for why callers should use it. */
export function onWishlistChange(handler: (items: WishlistItem[]) => void): () => void {
  const listener = ((e: CustomEvent<WishlistItem[]>) => handler(e.detail)) as EventListener;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Keeps every [data-wishlist-count] badge (Nav.astro) in sync — same pattern as cart.ts. */
function syncCounter(): void {
  const n = read().length;
  document.querySelectorAll<HTMLElement>('[data-wishlist-count]').forEach((el) => {
    el.textContent = String(n);
    el.dataset.empty = n === 0 ? 'true' : 'false';
  });
}

/** Keeps every rendered heart button's filled/outline state in sync with localStorage. */
function syncHeartButtons(): void {
  const saved = new Set(read().map((w) => w.id));
  document.querySelectorAll<HTMLElement>('[data-toggle-wishlist]').forEach((btn) => {
    const raw = btn.dataset.toggleWishlist;
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as WishlistItem;
      const active = saved.has(item.id);
      btn.setAttribute('aria-pressed', String(active));
      btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Guardar en favoritos');
      const path = btn.querySelector('path');
      if (path) path.setAttribute('fill', active ? 'currentColor' : 'none');
    } catch {
      /* malformed payload — leave that button alone */
    }
  });
}

/**
 * Delegated click handler: works for [data-toggle-wishlist] buttons present
 * on load AND for ones a live catalog/search render adds later — same
 * reasoning as wireAddToCartDelegation() in cart.ts. Buttons live inside the
 * card's <a>, so this also stops that link from navigating on click.
 */
function wireWishlistDelegation(): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest<HTMLElement>('[data-toggle-wishlist]');
    if (!btn) return;
    e.preventDefault();
    const raw = btn.dataset.toggleWishlist;
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as WishlistItem;
      if (!item.id || !item.slug) return;
      toggleWishlist(item);
    } catch {
      return;
    }
  });
}

export function initWishlist(): void {
  wireWishlistDelegation();
  onWishlistChange(syncHeartButtons);
  onWishlistChange(syncCounter);
  syncHeartButtons();
  syncCounter();
  // Cards (and the Nav badge) render fresh on every view-transition
  // navigation — resync both against the freshly-swapped-in DOM each time.
  document.addEventListener('astro:page-load', syncHeartButtons);
  document.addEventListener('astro:page-load', syncCounter);
}

if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') initWishlist();
  else document.addEventListener('DOMContentLoaded', initWishlist);
}
