import type { Category, Product } from '@/lib/types';
import categoriesData from '@/data/categories.json';
import productsData from '@/data/products.json';

const categories = categoriesData as Category[];
const products = productsData as Product[];

export function getCategories(): Category[] {
  return categories;
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getNewProducts(limit = 8): Product[] {
  const fresh = products.filter((p) => p.isNew);
  return (fresh.length ? fresh : products).slice(0, limit);
}

export interface CategoryFilter {
  sub?: string;
  brand?: string;
  soloNuevos?: boolean;
}

export function getProductsByCategory(slug: string, filter: CategoryFilter = {}): Product[] {
  return products.filter((p) => {
    if (p.categorySlug !== slug) return false;
    if (filter.sub && p.subcategorySlug !== filter.sub) return false;
    if (filter.brand && p.brand !== filter.brand) return false;
    if (filter.soloNuevos && !p.isNew) return false;
    return true;
  });
}

/** Distinct brands present in a category, sorted, for the filter panel. */
export function getBrandsInCategory(slug: string): string[] {
  const set = new Set(products.filter((p) => p.categorySlug === slug).map((p) => p.brand));
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

export function countInCategory(slug: string): number {
  return products.filter((p) => p.categorySlug === slug).length;
}

export function getRelated(product: Product, limit = 4): Product[] {
  const sameSub = products.filter(
    (p) => p.slug !== product.slug && p.categorySlug === product.categorySlug && p.subcategorySlug === product.subcategorySlug,
  );
  const sameCat = products.filter(
    (p) => p.slug !== product.slug && p.categorySlug === product.categorySlug && !sameSub.includes(p),
  );
  return [...sameSub, ...sameCat].slice(0, limit);
}

export function subcategoryName(category: Category, sub: string): string {
  return category.subcategories.find((s) => s.slug === sub)?.name ?? sub;
}
