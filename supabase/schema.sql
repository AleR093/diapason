-- Diapasón — esquema de autenticación y roles.
-- Pega esto en el SQL Editor de tu proyecto de Supabase (Database → SQL Editor)
-- después de crear el proyecto. Es idempotente: puedes volver a ejecutarlo.

-- 1) Tabla de perfiles: una fila por usuario de auth.users, con su rol.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- 2) Crea el perfil automáticamente cuando alguien se registra.
-- `security definer` es necesario para poder insertar en `profiles` aunque
-- el usuario que dispara el trigger todavía no tenga permisos (RLS abajo).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) Row Level Security: cada quien lee SOLO su propia fila. A propósito no
-- hay política de UPDATE/INSERT/DELETE para el rol `authenticated`, así que
-- nadie puede escribirse a sí mismo el rol `admin` desde el cliente — ese
-- perfil solo lo crea el trigger de arriba (via security definer).
alter table public.profiles enable row level security;

drop policy if exists "select_own_profile" on public.profiles;
create policy "select_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 4) Primer administrador: crea tu cuenta normal desde el sitio y luego
-- corre esto una sola vez (cambia el correo). Es la única forma soportada
-- de ascender a admin — no hay botón para eso en la UI, a propósito.
-- update public.profiles set role = 'admin' where email = 'tu-correo@diapason.sv';
