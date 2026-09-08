import { escapeHtml } from './product-render';
import type { Review, RecentReview } from '@/lib/supabase/reviews';

// Same path as Icon.astro's "star" — duplicated here because live-fetched
// data is rendered as HTML strings at runtime, not through Astro components.
const STAR_PATH = 'M12 3.3 14.6 9l6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1L9.4 9 12 3.3Z';

export function starsHTML(rating: number, size = 15): string {
  const full = Math.round(rating);
  return Array.from({ length: 5 })
    .map(
      (_, i) => `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="${i < full ? 'text-brass' : 'text-brass/25'}">
        <path d="${STAR_PATH}" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"></path>
      </svg>`,
    )
    .join('');
}

/** One review row for a product page's review list. */
export function reviewRowHTML(r: Review): string {
  const date = new Date(r.created_at).toLocaleDateString('es-SV', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `
    <article class="border-b border-line pb-6">
      <div class="flex items-center justify-between gap-3">
        <div class="flex gap-0.5">${starsHTML(r.rating)}</div>
        <p class="text-[0.76rem] text-brass-ink">${date}</p>
      </div>
      ${r.comment ? `<p class="prose-editorial mt-3 !max-w-none !text-[0.95rem]">${escapeHtml(r.comment)}</p>` : ''}
      <p class="mt-3 text-[0.85rem] font-medium">${escapeHtml(r.author_name)}</p>
    </article>`;
}

/** Floating glass card for the home page's review rain. */
export function reviewRainCardHTML(r: RecentReview): string {
  return `
    <article class="w-[260px] shrink-0 border border-bone/15 bg-bone/10 p-5 backdrop-blur-md">
      <div class="flex gap-0.5">${starsHTML(r.rating, 14)}</div>
      <p class="mt-3 text-[0.85rem] leading-relaxed text-bone/90 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
        &ldquo;${escapeHtml(r.comment ?? '')}&rdquo;
      </p>
      <p class="mt-4 truncate text-[0.76rem] font-medium text-bone/70">
        ${escapeHtml(r.author_name)}<span class="text-bone/45"> · ${escapeHtml(r.product_name)}</span>
      </p>
    </article>`;
}
