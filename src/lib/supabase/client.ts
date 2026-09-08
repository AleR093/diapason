import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL || '';
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * False until `.env` carries real project values (see `.env.example`).
 * The rest of the app checks this instead of letting `createClient` throw
 * and taking every page down with it.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[Diapasón] Faltan PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY. ' +
      'El inicio de sesión no funcionará hasta que configures tu proyecto de Supabase (ver .env.example).',
  );
}

/**
 * Single browser client for the whole site. Session is persisted by the SDK
 * (localStorage) and refreshed automatically — this is a client-only
 * integration, there is no server session to keep in sync.
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'public-anon-key-placeholder',
);
