import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from './client';

export type Role = 'customer' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}

export interface AuthState {
  /** 'loading' until the first session check resolves — never treat this as "signed out". */
  status: 'loading' | 'ready';
  session: Session | null;
  profile: Profile | null;
}

const EVENT = 'diapason:auth-change';
/** Never leave a page stuck on "verificando…" if Supabase is unreachable. */
const NETWORK_TIMEOUT_MS = 6000;

let current: AuthState = { status: 'loading', session: null, profile: null };
let initialized = false;

/** Races a promise against a timeout, falling back instead of hanging forever. */
function withTimeout<T>(promise: PromiseLike<T>, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), NETWORK_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const fetchProfile = (async (): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Diapasón] No se pudo cargar el perfil del usuario.', error.message);
      return null;
    }
    return data as Profile;
  })();

  return withTimeout(fetchProfile, null);
}

async function refresh(session: Session | null): Promise<void> {
  const profile = session ? await loadProfile(session.user.id) : null;
  current = { status: 'ready', session, profile };
  window.dispatchEvent(new CustomEvent<AuthState>(EVENT, { detail: current }));
}

/** Wires the Supabase session listener once per page load. Idempotent. */
export function initAuth(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  withTimeout(supabase.auth.getSession(), { data: { session: null }, error: null }).then(
    ({ data }) => refresh(data.session),
  );

  // Fires on sign-in, sign-out, token refresh and cross-tab sync.
  supabase.auth.onAuthStateChange((_event, session) => {
    refresh(session);
  });
}

export function getAuthState(): AuthState {
  return current;
}

export function onAuthChange(handler: (state: AuthState) => void): void {
  window.addEventListener(EVENT, ((e: CustomEvent<AuthState>) => handler(e.detail)) as EventListener);
}

export function isAdmin(state: AuthState = current): boolean {
  return state.profile?.role === 'admin';
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  return { error, needsEmailConfirmation: !error && !data.session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Start listening the moment this module is first imported anywhere
// (Base.astro loads it globally), so every page shares one live session.
initAuth();
