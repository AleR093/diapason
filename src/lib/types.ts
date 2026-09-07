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
