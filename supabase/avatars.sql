-- Diapasón — fotos de perfil de usuario.
-- Pega esto en el SQL Editor DESPUÉS de haber corrido schema.sql y reviews.sql
-- (agrega avatar_url a profiles y a reviews). Es idempotente.

alter table public.profiles add column if not exists avatar_url text;

-- Las reseñas guardan su propia copia del avatar (igual que ya hacen con
-- author_name) porque profiles solo se puede leer por su dueño (ver
-- "select_own_profile" en schema.sql) — no hay forma de unir reviews ->
-- profiles del lado del cliente para mostrar el avatar de otra persona.
alter table public.reviews add column if not exists avatar_url text;

-- profiles no tiene política de UPDATE a propósito (ver schema.sql: nadie
-- debe poder escribirse role='admin' a sí mismo). En vez de abrir una
-- política genérica de update, esta función security definer solo permite
-- cambiar avatar_url de la PROPIA fila — ninguna otra columna es alcanzable
-- por este camino.
create or replace function public.update_my_avatar(new_avatar_url text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set avatar_url = new_avatar_url where id = auth.uid();
end;
$$;

grant execute on function public.update_my_avatar(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "public_read_avatars" on storage.objects;
create policy "public_read_avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Cada quien sube/actualiza/borra SOLO dentro de su propia carpeta:
-- avatars/<uid>/archivo.jpg — storage.foldername(name) da ese primer segmento.
drop policy if exists "own_upload_avatar" on storage.objects;
create policy "own_upload_avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own_update_avatar" on storage.objects;
create policy "own_update_avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own_delete_avatar" on storage.objects;
create policy "own_delete_avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
