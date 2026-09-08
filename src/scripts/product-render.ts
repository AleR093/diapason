import type { StoreProduct } from '@/lib/types';
import { FELT_PLACEHOLDER } from '@/lib/img';

const money = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function formatPriceJS(value: number): string {
  return money.format(value);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

/**
 * A shared view-transition-name for a product's image, set by hand (not via
 * Astro's `transition:name` directive, since these cards are plain HTML
 * strings rendered client-side, not Astro components). Matching this same
 * name on the card's image and on /producto's hero image is what makes the
 * click-through morph instead of hard-cutting. Slugs are already a safe CSS
 * identifier (see slugify() in products.ts) — the replace is just a guard.
 */
export function productImageTransitionName(slug: string): string {
  return `product-${slug.replace(/[^a-z0-9-]/gi, '')}`;
}

/** Same visual language as ProductCard.astro, built at runtime for live-fetched data. */
export function productCardHTML(p: StoreProduct, opts: { inRail?: boolean } = {}): string {
  const img = p.images[0] || FELT_PLACEHOLDER;
  const cartPayload = escapeAttr(
    JSON.stringify({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: img }),
  );
  const wrapClass = opts.inRail ? 'group/card w-[64vw] max-w-[280px] shrink-0 snap-start sm:w-[280px]' : 'group/card';

  return `
    <article class="${wrapClass}">
      <a href="/producto?slug=${encodeURIComponent(p.slug)}" class="block">
        <div class="card-media">
          ${p.is_new ? '<span class="card-tag">Nuevo</span>' : ''}
          <img
            src="${escapeAttr(img)}"
            alt="${escapeAttr(p.name)}"
            width="640"
            height="800"
            loading="lazy"
            decoding="async"
            style="background:#E4DDCE; view-transition-name: ${productImageTransitionName(p.slug)}"
            onerror="this.onerror=null;this.src='${FELT_PLACEHOLDER}'"
          />
        </div>
        <div class="mt-3">
          ${p.brand ? `<p class="truncate text-[0.72rem] font-medium uppercase tracking-[0.14em] text-brass-ink">${escapeHtml(p.brand)}</p>` : ''}
          <div class="mt-1 flex items-baseline justify-between gap-3">
            <h3 class="min-w-0 text-[0.98rem] font-medium leading-snug [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] overflow-hidden group-hover/card:underline underline-offset-4">
              ${escapeHtml(p.name)}
            </h3>
            <p class="u-tabular shrink-0 text-[0.95rem] font-medium">${formatPriceJS(p.price)}</p>
          </div>
        </div>
      </a>
      <button
        type="button"
        class="btn btn--outline mt-3 w-full justify-center !text-[0.7rem]"
        data-add-to-cart="${cartPayload}"
      >
        <span data-add-label>Añadir al carrito</span>
      </button>
    </article>
  `;
}

/** Horizontal scroll-snap rail shell, populated with live-fetched cards. */
export function productRailHTML(products: StoreProduct[]): string {
  return `
    <div class="edge-fade-r -mx-5 md:-mx-10 xl:-mx-14">
      <ul class="rail flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 md:gap-6 md:px-10 xl:px-14">
        ${products.map((p) => `<li>${productCardHTML(p, { inRail: true })}</li>`).join('')}
      </ul>
    </div>
  `;
}

/** Compact row used inside the search results list. */
export function searchResultHTML(p: StoreProduct): string {
  const img = p.images[0] || FELT_PLACEHOLDER;
  return `
    <a href="/producto?slug=${encodeURIComponent(p.slug)}" class="flex items-center gap-4 border-b border-line py-3 hover:bg-felt/50">
      <div class="h-14 w-12 shrink-0 overflow-hidden bg-felt">
        <img src="${escapeAttr(img)}" alt="" width="48" height="56" class="h-full w-full object-cover" onerror="this.onerror=null;this.src='${FELT_PLACEHOLDER}'" />
      </div>
      <div class="min-w-0 flex-1">
        ${p.brand ? `<p class="truncate text-[0.7rem] font-medium uppercase tracking-[0.12em] text-brass-ink">${escapeHtml(p.brand)}</p>` : ''}
        <p class="truncate text-[0.92rem] font-medium">${escapeHtml(p.name)}</p>
      </div>
      <p class="u-tabular shrink-0 text-[0.88rem] font-medium">${formatPriceJS(p.price)}</p>
    </a>
  `;
}
