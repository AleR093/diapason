/**
 * Skeleton placeholders shown while Supabase data is in flight. `.card-media`
 * already carries the felt background (see global.css) — `animate-pulse`
 * alone is enough to read as "loading", no extra color overrides needed.
 * Plain functions (no DOM APIs), so producto/index.astro can also call
 * pdpSkeletonHTML() at build time for the very first paint.
 */

function skeletonCardHTML(): string {
  return `
    <article class="animate-pulse">
      <div class="card-media"></div>
      <div class="mt-3 h-3 w-2/5 bg-felt"></div>
      <div class="mt-2 h-4 w-4/5 bg-felt"></div>
      <div class="mt-3 h-9 w-full bg-felt"></div>
    </article>`;
}

export function productGridSkeletonHTML(count = 8): string {
  return Array.from({ length: count }).map(() => skeletonCardHTML()).join('');
}

export function pdpSkeletonHTML(): string {
  return `
    <div class="grid animate-pulse gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      <div class="card-media"></div>
      <div>
        <div class="h-3 w-24 bg-felt"></div>
        <div class="mt-4 h-8 w-3/4 bg-felt"></div>
        <div class="mt-4 h-6 w-28 bg-felt"></div>
        <div class="mt-6 h-20 w-full bg-felt"></div>
        <div class="mt-6 h-11 w-40 bg-felt"></div>
      </div>
    </div>`;
}
