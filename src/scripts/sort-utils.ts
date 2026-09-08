import type { StoreProduct } from '@/lib/types';

export type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'rating';

/** listProducts() already orders by created_at desc, so 'recent' is a pass-through. */
export function sortProducts(
  products: StoreProduct[],
  sort: SortOption,
  ratings?: Record<string, number>,
): StoreProduct[] {
  const arr = [...products];
  switch (sort) {
    case 'price-asc':
      return arr.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return arr.sort((a, b) => b.price - a.price);
    case 'rating':
      // Unrated products (no entry in `ratings`) sort last, not first.
      return arr.sort((a, b) => (ratings?.[b.id] ?? 0) - (ratings?.[a.id] ?? 0));
    case 'recent':
    default:
      return arr;
  }
}
