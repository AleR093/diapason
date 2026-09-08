import type { APIRoute } from 'astro';
import { getCategories } from '@/lib/catalog';

// Product pages are client-rendered from Supabase at /producto?slug=... (see
// src/pages/producto/index.astro) and aren't enumerable at build time, so
// they're intentionally left out of the sitemap — only the static shell
// routes are listed here.
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('https://diapason.pages.dev')).origin;
  const categories = getCategories();

  const paths = [
    '/',
    '/catalogo',
    ...categories.map((c) => `/catalogo/${c.slug}`),
    ...categories.flatMap((c) => c.subcategories.map((s) => `/catalogo/${c.slug}/${s.slug}`)),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
