import type { StoreCategory } from '@/lib/supabase/categories';
import { countByCategory } from '@/lib/supabase/products';
import { unsplash } from '@/lib/img';
import { escapeAttr, escapeHtml } from './product-render';

/** Same visual language as the deleted CategoryTile.astro, built at runtime for live-fetched data. */
export function categoryTileHTML(category: StoreCategory): string {
  const img = unsplash(category.hero_image || '1525201548942-d8732f6617a0', 800, '1/1');
  return `
    <a
      href="/catalogo?categoria=${encodeURIComponent(category.slug)}"
      class="group/tile relative block aspect-square overflow-hidden bg-felt"
      data-category-tile="${escapeAttr(category.slug)}"
    >
      <img
        src="${escapeAttr(img)}"
        alt=""
        width="800"
        height="800"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-[500ms] ease-editorial group-hover/tile:scale-[1.04]"
      />
      <div class="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent" aria-hidden="true"></div>
      <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-5">
        <h3 class="h-section !text-[1.05rem] text-paper md:!text-[1.25rem]">${escapeHtml(category.name)}</h3>
        <span class="u-tabular hidden shrink-0 pb-1 text-[0.72rem] font-medium text-paper/75 sm:block" data-tile-count>&nbsp;</span>
      </div>
    </a>
  `;
}

/** Fills each tile's live piece count after its HTML has been inserted into the DOM. */
export function wireCategoryTileCounts(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-category-tile]').forEach(async (tile) => {
    const slug = tile.dataset.categoryTile;
    if (!slug) return;
    const n = await countByCategory(slug);
    const badge = tile.querySelector<HTMLElement>('[data-tile-count]');
    if (badge) badge.textContent = `${n} ${n === 1 ? 'pieza' : 'piezas'}`;
  });
}

/** Same look as Chip.astro, built at runtime for a category's live subcategory list. */
export function subcategoryChipHTML(
  label: string,
  href: string,
  active: boolean,
  extraAttrs = '',
): string {
  return `
    <a href="${escapeAttr(href)}" class="chip" data-active="${active}" ${active ? 'aria-current="true"' : ''} ${extraAttrs}>
      ${escapeHtml(label)}
    </a>
  `;
}
