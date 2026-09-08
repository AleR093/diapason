import type { Category } from '@/lib/types';
import categoriesData from '@/data/categories.json';

const categories = categoriesData as Category[];

// Categories and subcategories are fixed configuration (not admin-editable),
// so they stay static — only the products inside them are live (Supabase).
// See src/lib/supabase/products.ts for the catalog's real data.

export function getCategories(): Category[] {
  return categories;
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function subcategoryName(category: Category, sub: string): string {
  return category.subcategories.find((s) => s.slug === sub)?.name ?? sub;
}
