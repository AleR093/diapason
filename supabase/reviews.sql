-- Diapasón — reseñas de producto y "lluvia de reseñas" de la portada.
-- Pega esto en el SQL Editor de Supabase DESPUÉS de haber corrido products.sql
-- (necesita la tabla `products`). Es idempotente.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Nula cuando la deja un visitante sin cuenta.
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'Cliente Anónimo',
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists reviews_product_idx on public.reviews (product_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- Row Level Security: el catálogo público puede leer todas las reseñas;
-- cualquiera puede publicar una, con sesión o como visitante anónimo. A
-- propósito no hay política de update/delete: una reseña publicada no se
-- puede editar ni borrar desde el cliente.
alter table public.reviews enable row level security;

drop policy if exists "public_read_reviews" on public.reviews;
create policy "public_read_reviews"
  on public.reviews for select
  using (true);

drop policy if exists "public_insert_reviews" on public.reviews;
create policy "public_insert_reviews"
  on public.reviews for insert
  to anon, authenticated
  with check (true);
