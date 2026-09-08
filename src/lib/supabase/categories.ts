import { supabase } from './client';

const CATEGORIES_TABLE = 'categories';
const SUBCATEGORIES_TABLE = 'subcategories';

export interface StoreSubcategory {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface StoreCategory {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  intro: string;
  hero_image: string | null;
  sort_order: number;
  subcategories: StoreSubcategory[];
}

export interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface CategoryInput {
  name: string;
  blurb?: string;
  intro?: string;
  heroImage?: string | null;
}

export interface SubcategoryInput {
  categoryId: string;
  name: string;
}

// No random suffix here (unlike products' slugify): a category slug is meant
// to be short and predictable — the unique constraint in categories.sql
// rejects a duplicate instead of silently disambiguating it.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Friendlier Spanish message for the one Postgres error admins are likely to hit here. */
function friendlyError(error: { code?: string; message: string }, subject: string): string {
  if (error.code === '23505') return `Ya existe ${subject} con ese nombre.`;
  if (error.code === '23503') return `No se puede eliminar: todavía hay productos usando ${subject}.`;
  return error.message;
}

const SELECT_WITH_SUBS = '*, subcategories(*)';

function sortSubcategories(row: StoreCategory): StoreCategory {
  return { ...row, subcategories: [...(row.subcategories ?? [])].sort((a, b) => a.sort_order - b.sort_order) };
}

/** Every category with its subcategories, in display order — the catalog's live structure. */
export async function listCategories(): Promise<Result<StoreCategory[]>> {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .select(SELECT_WITH_SUBS)
    .order('sort_order', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: ((data ?? []) as unknown as StoreCategory[]).map(sortSubcategories), error: null };
}

export async function getCategoryBySlug(slug: string): Promise<Result<StoreCategory>> {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .select(SELECT_WITH_SUBS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'no encontrada' };
  return { data: sortSubcategories(data as unknown as StoreCategory), error: null };
}

export async function countCategories(): Promise<number> {
  const { count, error } = await supabase.from(CATEGORIES_TABLE).select('id', { count: 'exact', head: true });
  return error ? 0 : (count ?? 0);
}

export async function createCategory(input: CategoryInput): Promise<Result<StoreCategory>> {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .insert({
      slug: slugify(input.name),
      name: input.name,
      blurb: input.blurb ?? '',
      intro: input.intro ?? '',
      hero_image: input.heroImage || null,
    })
    .select()
    .single();
  if (error) return { data: null, error: friendlyError(error, 'una categoría') };
  return { data: { ...(data as Omit<StoreCategory, 'subcategories'>), subcategories: [] }, error: null };
}

// The slug stays fixed once created — it's the FK products.category_slug points
// at, and URLs (/catalogo?categoria=…) already spread it into links elsewhere.
// "Renombrar" changes what shoppers see, not the identifier things point to.
export async function updateCategory(id: string, input: CategoryInput): Promise<Result<StoreCategory>> {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .update({
      name: input.name,
      blurb: input.blurb ?? '',
      intro: input.intro ?? '',
      hero_image: input.heroImage || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return { data: null, error: friendlyError(error, 'una categoría') };
  return { data: { ...(data as Omit<StoreCategory, 'subcategories'>), subcategories: [] }, error: null };
}

export async function deleteCategory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(CATEGORIES_TABLE).delete().eq('id', id);
  return { error: error ? friendlyError(error, 'esta categoría') : null };
}

export async function createSubcategory(input: SubcategoryInput): Promise<Result<StoreSubcategory>> {
  const { data, error } = await supabase
    .from(SUBCATEGORIES_TABLE)
    .insert({ category_id: input.categoryId, slug: slugify(input.name), name: input.name })
    .select()
    .single();
  if (error) return { data: null, error: friendlyError(error, 'una subcategoría') };
  return { data: data as StoreSubcategory, error: null };
}

export async function updateSubcategory(id: string, name: string): Promise<Result<StoreSubcategory>> {
  const { data, error } = await supabase
    .from(SUBCATEGORIES_TABLE)
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) return { data: null, error: friendlyError(error, 'una subcategoría') };
  return { data: data as StoreSubcategory, error: null };
}

export async function deleteSubcategory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(SUBCATEGORIES_TABLE).delete().eq('id', id);
  return { error: error ? friendlyError(error, 'esta subcategoría') : null };
}
