-- Diapasón — catálogo dinámico (tabla products + bucket de imágenes).
-- Pega esto en el SQL Editor de Supabase DESPUÉS de haber corrido schema.sql
-- (necesita la tabla `profiles` para saber quién es admin). Es idempotente.

-- 1) Tabla de productos — la fuente en vivo del catálogo público.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  brand text,
  category_slug text not null
    check (category_slug in ('guitarras', 'teclados', 'vientos', 'percusion', 'audio')),
  subcategory_slug text,
  price numeric(10, 2) not null check (price >= 0),
  description text,
  stock integer not null default 0 check (stock >= 0),
  is_new boolean not null default true,
  -- Primer elemento = imagen principal. Los productos del panel llevan una sola.
  images text[] not null default '{}',
  -- Especificaciones libres ({label, value}[]) — el formulario del panel no las
  -- edita todavía; quedan disponibles para cargarlas a mano o en una futura vista.
  specs jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_slug);
create index if not exists products_created_at_idx on public.products (created_at desc);

-- Mantiene updated_at al día en cada edición.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- 2) Row Level Security: el catálogo es público para leer; solo un admin
-- (según public.profiles.role, ver schema.sql) puede crear, editar o borrar.
alter table public.products enable row level security;

drop policy if exists "public_read_products" on public.products;
create policy "public_read_products"
  on public.products for select
  using (true);

drop policy if exists "admin_insert_products" on public.products;
create policy "admin_insert_products"
  on public.products for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "admin_update_products" on public.products;
create policy "admin_update_products"
  on public.products for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "admin_delete_products" on public.products;
create policy "admin_delete_products"
  on public.products for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- 3) Bucket público para las fotos de producto que sube el panel.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_product_images" on storage.objects;
create policy "public_read_product_images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "admin_upload_product_images" on storage.objects;
create policy "admin_upload_product_images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "admin_update_product_images" on storage.objects;
create policy "admin_update_product_images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "admin_delete_product_images" on storage.objects;
create policy "admin_delete_product_images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
