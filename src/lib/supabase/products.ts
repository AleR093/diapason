import type { StoreProduct } from '@/lib/types';
import { supabase } from './client';

const BUCKET = 'product-images';
const TABLE = 'products';

export interface ProductInput {
  name: string;
  categorySlug: string;
  subcategorySlug?: string | null;
  brand?: string | null;
  price: number;
  description: string;
  stock: number;
}

export interface ListFilters {
  category?: string;
  subcategory?: string;
  search?: string;
  onlyNew?: boolean;
  limit?: number;
}

export interface Result<T> {
  data: T | null;
  error: string | null;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents left over from NFD normalization
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'producto'}-${suffix}`;
}

/** Every catalog read the storefront needs — category/subcategory/search filters compose. */
export async function listProducts(filters: ListFilters = {}): Promise<Result<StoreProduct[]>> {
  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

  if (filters.category) query = query.eq('category_slug', filters.category);
  if (filters.subcategory) query = query.eq('subcategory_slug', filters.subcategory);
  if (filters.onlyNew) query = query.eq('is_new', true);
  if (filters.search) {
    const term = filters.search.trim();
    if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,category_slug.ilike.%${term}%`);
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as StoreProduct[], error: null };
}

export async function getProductBySlug(slug: string): Promise<Result<StoreProduct>> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('slug', slug).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'no encontrado' };
  return { data: data as StoreProduct, error: null };
}

export async function getRelatedProducts(product: StoreProduct, limit = 6): Promise<StoreProduct[]> {
  const { data } = await listProducts({ category: product.category_slug, limit: limit + 1 });
  return (data ?? []).filter((p) => p.id !== product.id).slice(0, limit);
}

export async function countByCategory(categorySlug: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('category_slug', categorySlug);
  return error ? 0 : (count ?? 0);
}

export async function uploadProductImage(file: File): Promise<Result<string>> {
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError) return { data: null, error: uploadError.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { data: data.publicUrl, error: null };
}

export async function createProduct(input: ProductInput, imageFile: File): Promise<Result<StoreProduct>> {
  const { data: imageUrl, error: imageError } = await uploadProductImage(imageFile);
  if (imageError || !imageUrl) return { data: null, error: imageError ?? 'No se pudo subir la imagen.' };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      slug: slugify(input.name),
      name: input.name,
      brand: input.brand || null,
      category_slug: input.categorySlug,
      subcategory_slug: input.subcategorySlug || null,
      price: input.price,
      description: input.description,
      stock: input.stock,
      is_new: true,
      images: [imageUrl],
      specs: [],
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as StoreProduct, error: null };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  imageFile?: File | null,
): Promise<Result<StoreProduct>> {
  const patch: Record<string, unknown> = {
    name: input.name,
    brand: input.brand || null,
    category_slug: input.categorySlug,
    subcategory_slug: input.subcategorySlug || null,
    price: input.price,
    description: input.description,
    stock: input.stock,
  };

  if (imageFile) {
    const { data: imageUrl, error: imageError } = await uploadProductImage(imageFile);
    if (imageError || !imageUrl) return { data: null, error: imageError ?? 'No se pudo subir la imagen.' };
    patch.images = [imageUrl];
  }

  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as StoreProduct, error: null };
}

export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return { error: error?.message ?? null };
}
