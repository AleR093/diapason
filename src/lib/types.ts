export type StockState = 'disponible' | 'bajo pedido';

export interface Spec {
  label: string;
  value: string;
}

export interface Subcategory {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string;
  /** Short serif sentence shown under the category name. */
  blurb: string;
  /** Longer editorial paragraph shown at the foot of the listing page. */
  intro: string;
  heroImage: string;
  subcategories: Subcategory[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  subcategorySlug: string;
  price: number;
  isNew: boolean;
  stock: StockState;
  /** First entry is the primary image. */
  images: string[];
  /** 2-3 sentence serif story. */
  story: string;
  specs: Spec[];
}

/**
 * Live product row from Supabase (`public.products`) — the catalog's real
 * source of truth. Distinct from the legacy `Product` shape above, which
 * only backed the original static seed data (see src/data/products.json,
 * migrated into Supabase via supabase/seed-products.sql).
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

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  city: string;
  /** 1–5. */
  rating: number;
}
