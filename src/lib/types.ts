export interface Spec {
  label: string;
  value: string;
}

/**
 * Live product row from Supabase (`public.products`) — the catalog's real
 * source of truth. Categories/subcategories have their own live shapes in
 * `src/lib/supabase/categories.ts` (StoreCategory/StoreSubcategory).
 */
export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category_slug: string;
  subcategory_slug: string | null;
  price: number;
  description: string | null;
  stock: number;
  is_new: boolean;
  images: string[];
  specs: Spec[];
  created_at: string;
}
