import type { APIRoute } from 'astro';

// The whole catalog (categories, subcategories and products) is client-rendered
// from Supabase via query strings (/catalogo?categoria=…, /producto?slug=…) and
// isn't enumerable at build time — admin-created categories/products need zero
// rebuild to show up, which is the whole point. Only the static shell routes
// are listed here.
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('https://diapason.pages.dev')).origin;

  const paths = ['/', '/catalogo'];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
