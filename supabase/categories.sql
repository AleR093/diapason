-- Diapasón — categorías y subcategorías editables desde /admin.
-- Pega esto en el SQL Editor DESPUÉS de products.sql y ANTES de seed-products.sql
-- (products.category_slug pasa de una lista fija a apuntar a esta tabla por FK,
-- y seed-products.sql necesita que esas categorías ya existan). Es idempotente.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  -- Frase corta bajo el nombre + párrafo largo al pie del listado.
  blurb text not null default '',
  intro text not null default '',
  -- Id de foto de Unsplash (mismo formato que src/lib/img.ts espera), no una URL completa.
  hero_image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

create index if not exists subcategories_category_idx on public.subcategories (category_id);

-- Reutiliza la función creada en products.sql.
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute procedure public.set_updated_at();

-- Semilla: las 5 familias originales (antes en src/data/categories.json), para
-- no arrancar vacío y para que el FK de más abajo tenga a quién apuntar.
insert into public.categories (slug, name, blurb, intro, hero_image, sort_order) values
  (
    'guitarras', 'Guitarras',
    'Eléctricas, acústicas, clásicas y bajos, cada una ajustada en el taller antes de salir.',
    'Toda guitarra que entra a Diapasón pasa por el banco de ajuste: se revisa el alma, se nivela el diapasón, se afina la altura de las cuerdas y se calibra la octava. Elige por estilo —del blues al flamenco— y consulta las especificaciones completas de maderas, pastillas y escala. Si no ves el acabado que buscas, pregúntanos por WhatsApp y lo conseguimos.',
    '1605020420620-20c943cc4669', 1
  ),
  (
    'teclados', 'Teclados',
    'Sintetizadores, pianos digitales y controladores para escenario y estudio.',
    'Desde pianos digitales de acción con contrapeso hasta sintetizadores analógicos y controladores MIDI para producción. Cada ficha detalla polifonía, tipo de teclas, conectividad y peso, para que sepas si cabe en tu setup antes de comprarlo. Probadores disponibles en tienda; disponibilidad y entrega, por WhatsApp.',
    '1520523839897-bd0b52f945a0', 2
  ),
  (
    'vientos', 'Vientos',
    'Saxofones, trompetas, clarinetes y flautas revisados por un técnico especialista.',
    'Los instrumentos de viento llegan con revisión de zapatillas, corchos y mecánica, y salen listos para tocar. Consulta la afinación, el calibre del tudel o la boquilla incluida en cada ficha. Trabajamos marcas de estudiante y profesionales; si buscas un modelo concreto, escríbenos y lo ubicamos.',
    '1573871669414-010dbf73ca84', 3
  ),
  (
    'percusion', 'Percusión',
    'Baterías acústicas y electrónicas, cajones y platillos para todo escenario.',
    'Baterías completas y por piezas, kits electrónicos con módulo, cajones flamencos y una pared de platillos para probar al oído. Cada ficha indica medidas de cascos, materiales, herrajes incluidos y si necesita amplificación. El armado y la afinación inicial van incluidos en compras de batería acústica.',
    '1543443258-92b04ad5ec6b', 4
  ),
  (
    'audio', 'Audio',
    'Monitores, interfaces, micrófonos y audífonos para grabar y mezclar en casa.',
    'Equipo de estudio elegido para salas reales, no para hojas de datos: monitores que perdonan una acústica difícil, interfaces con previos limpios, micrófonos versátiles y audífonos honestos para mezcla. Cada ficha trae respuesta en frecuencia, conectividad y latencia reportada. ¿Dudas de compatibilidad? Cuéntanos tu cadena por WhatsApp.',
    '1563330232-57114bb0823c', 5
  )
on conflict (slug) do nothing;

insert into public.subcategories (category_id, slug, name, sort_order)
select c.id, s.slug, s.name, s.sort_order
from public.categories c
join (values
  ('guitarras', 'electricas', 'Eléctricas', 1),
  ('guitarras', 'acusticas', 'Acústicas', 2),
  ('guitarras', 'clasicas', 'Clásicas', 3),
  ('guitarras', 'bajos', 'Bajos', 4),
  ('teclados', 'sintetizadores', 'Sintetizadores', 1),
  ('teclados', 'pianos-digitales', 'Pianos digitales', 2),
  ('teclados', 'controladores', 'Controladores', 3),
  ('teclados', 'organos', 'Órganos', 4),
  ('vientos', 'saxofones', 'Saxofones', 1),
  ('vientos', 'trompetas', 'Trompetas', 2),
  ('vientos', 'clarinetes', 'Clarinetes', 3),
  ('vientos', 'flautas', 'Flautas', 4),
  ('percusion', 'baterias-acusticas', 'Baterías acústicas', 1),
  ('percusion', 'baterias-electronicas', 'Baterías electrónicas', 2),
  ('percusion', 'cajones', 'Cajones', 3),
  ('percusion', 'platillos', 'Platillos', 4),
  ('audio', 'monitores', 'Monitores', 1),
  ('audio', 'interfaces', 'Interfaces', 2),
  ('audio', 'microfonos', 'Micrófonos', 3),
  ('audio', 'audifonos', 'Audífonos', 4)
) as s(category_slug, slug, name, sort_order) on s.category_slug = c.slug
on conflict (category_id, slug) do nothing;

-- Row Level Security: mismo patrón que products — lectura pública, escritura solo admin.
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;

drop policy if exists "public_read_categories" on public.categories;
create policy "public_read_categories"
  on public.categories for select
  using (true);

drop policy if exists "admin_insert_categories" on public.categories;
create policy "admin_insert_categories"
  on public.categories for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "admin_update_categories" on public.categories;
create policy "admin_update_categories"
  on public.categories for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "admin_delete_categories" on public.categories;
create policy "admin_delete_categories"
  on public.categories for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "public_read_subcategories" on public.subcategories;
create policy "public_read_subcategories"
  on public.subcategories for select
  using (true);

drop policy if exists "admin_insert_subcategories" on public.subcategories;
create policy "admin_insert_subcategories"
  on public.subcategories for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "admin_update_subcategories" on public.subcategories;
create policy "admin_update_subcategories"
  on public.subcategories for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "admin_delete_subcategories" on public.subcategories;
create policy "admin_delete_subcategories"
  on public.subcategories for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- products.category_slug dejaba de ser una lista fija ('guitarras','teclados',…)
-- y pasa a apuntar a categories.slug — así una categoría nueva creada desde el
-- panel ya sirve para clasificar productos sin tocar SQL de nuevo. Si un admin
-- intenta borrar una categoría que todavía tiene productos, esta FK lo impide
-- (RESTRICT es el comportamiento por defecto) en vez de dejar productos huérfanos.
alter table public.products drop constraint if exists products_category_slug_check;
alter table public.products
  add constraint products_category_slug_fkey foreign key (category_slug) references public.categories (slug);

-- products.subcategory_slug se queda como texto libre sin FK a propósito: los
-- slugs de subcategoría solo son únicos DENTRO de su categoría, no globalmente,
-- así que una referencia estricta no es representable con una sola columna.
-- Borrar una subcategoría no borra ni bloquea los productos que la usaban; su
-- texto simplemente deja de coincidir con ningún filtro visible en el catálogo.
