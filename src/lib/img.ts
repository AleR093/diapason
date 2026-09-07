/**
 * Build a sized Unsplash URL from a bare photo id (the part after `photo-`).
 * Swapping to owned photography later means replacing the ids in
 * `src/data/*.json` with local paths and bypassing this helper.
 */
export function unsplash(id: string, w = 900, ratio: '4/5' | '1/1' | '16/9' = '4/5'): string {
  const [rw, rh] = ratio.split('/').map(Number);
  const h = Math.round((w * rh) / rw);
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

/** Inline SVG placeholder in the felt tone — used as an <img> onerror fallback. */
export const FELT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5'%3E%3Crect width='4' height='5' fill='%23E4DDCE'/%3E%3C/svg%3E";
