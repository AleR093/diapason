import { countProducts, countLowStock } from '@/lib/supabase/products';
import { countReviews } from '@/lib/supabase/reviews';
import { countCategories } from '@/lib/supabase/categories';

/** Fills the four metric cards in the admin banner. Re-runs on demand (see admin/index.astro). */
export async function refreshAdminMetrics(): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-admin-metrics]');
  if (!root) return;

  const productsEl = root.querySelector<HTMLElement>('[data-metric-products]');
  const reviewsEl = root.querySelector<HTMLElement>('[data-metric-reviews]');
  const categoriesEl = root.querySelector<HTMLElement>('[data-metric-categories]');
  const lowStockEl = root.querySelector<HTMLElement>('[data-metric-lowstock]');

  const [products, reviews, categories, lowStock] = await Promise.all([
    countProducts(),
    countReviews(),
    countCategories(),
    countLowStock(),
  ]);

  if (productsEl) productsEl.textContent = String(products);
  if (reviewsEl) reviewsEl.textContent = String(reviews);
  if (categoriesEl) categoriesEl.textContent = String(categories);
  if (lowStockEl) lowStockEl.textContent = String(lowStock);
}
