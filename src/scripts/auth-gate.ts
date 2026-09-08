import { getAuthState, isAdmin, onAuthChange, signOut, type AuthState } from '@/lib/supabase/auth';

interface GateOptions {
  /** When true, a signed-in non-admin sees the "denied" panel instead of the content. */
  requireAdmin?: boolean;
}

/**
 * Client-side route guard: swaps four panels inside [data-auth-gate] based on
 * session state — loading / signed-out / denied / content. This runs entirely
 * in the browser (the site is static), so treat it as a UX gate, not a
 * security boundary: the real protection is Row Level Security in Supabase,
 * which refuses to hand back data without a valid, authorized session.
 */
export function initAuthGate({ requireAdmin = false }: GateOptions = {}): void {
  const root = document.querySelector<HTMLElement>('[data-auth-gate]');
  if (!root) return;

  const panels = {
    loading: root.querySelector<HTMLElement>('[data-gate-loading]'),
    signedOut: root.querySelector<HTMLElement>('[data-gate-signed-out]'),
    denied: root.querySelector<HTMLElement>('[data-gate-denied]'),
    content: root.querySelector<HTMLElement>('[data-gate-content]'),
  };

  function show(target: HTMLElement | null | undefined) {
    for (const panel of Object.values(panels)) {
      if (panel) panel.hidden = panel !== target;
    }
  }

  function render(state: AuthState) {
    if (state.status === 'loading') {
      show(panels.loading);
      return;
    }
    if (!state.session) {
      show(panels.signedOut);
      return;
    }
    if (requireAdmin && !isAdmin(state)) {
      show(panels.denied);
    } else {
      show(panels.content);
    }

    root!.querySelectorAll<HTMLElement>('[data-user-email]').forEach((el) => {
      el.textContent = state.session?.user.email ?? '';
    });
    root!.querySelectorAll<HTMLElement>('[data-user-role]').forEach((el) => {
      el.textContent = isAdmin(state) ? 'Administrador' : 'Cliente';
    });
    // Elements marked admin-only stay hidden for a signed-in customer even
    // on pages that don't require admin to view at all (e.g. /cuenta).
    root!.querySelectorAll<HTMLElement>('[data-admin-only]').forEach((el) => {
      el.hidden = !isAdmin(state);
    });
  }

  root.querySelectorAll<HTMLElement>('[data-open-auth]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('diapason:open-auth'));
    });
  });

  root.querySelectorAll<HTMLElement>('[data-sign-out]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void signOut();
    });
  });

  onAuthChange(render);
  render(getAuthState());
}
