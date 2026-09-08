import { supabase } from './client';

const TABLE = 'reviews';

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** A review plus the name/slug of the product it belongs to — for the home page's review rain. */
export interface RecentReview extends Review {
  product_name: string;
  product_slug: string;
}

export interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface NewReview {
  productId: string;
  userId?: string | null;
  authorName: string;
  rating: number;
  comment: string;
}

/** All reviews for one product, newest first — feeds the product page's rating summary and list. */
export async function getReviewsByProduct(productId: string): Promise<Result<Review[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Review[], error: null };
}

export async function addReview(input: NewReview): Promise<Result<Review>> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      product_id: input.productId,
      user_id: input.userId || null,
      author_name: input.authorName.trim() || 'Cliente Anónimo',
      rating: input.rating,
      comment: input.comment.trim() || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Review, error: null };
}

interface ReviewRow extends Review {
  products: { name: string; slug: string } | null;
}

/** Best recent reviews across the whole catalog, comment required — for the home page's review rain. */
export async function getTopRecentReviews(limit = 12): Promise<Result<RecentReview[]>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, products(name, slug)')
    .not('comment', 'is', null)
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as unknown as ReviewRow[];
  const mapped: RecentReview[] = rows.map(({ products, ...rest }) => ({
    ...rest,
    product_name: products?.name ?? '',
    product_slug: products?.slug ?? '',
  }));
  return { data: mapped, error: null };
}
