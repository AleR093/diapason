/**
 * Lightweight toast feedback — no dependencies, creates its own container on
 * first use. Meant for quick confirmations (added to cart, saved in /admin,
 * review published), not for anything the user must read carefully.
 */
type ToastType = 'success' | 'error';

function ensureContainer(): HTMLElement {
  let container = document.querySelector<HTMLElement>('[data-toast-container]');
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('data-toast-container', '');
    container.setAttribute('aria-live', 'polite');
    container.className = 'fixed bottom-5 right-5 z-[95] flex flex-col items-end gap-2';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message: string, type: ToastType = 'success'): void {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.className = [
    'toast-card max-w-[20rem] border px-4 py-3 text-[0.85rem] font-medium shadow-[0_12px_40px_-16px_rgba(26,23,20,0.45)] backdrop-blur-md',
    type === 'error' ? 'border-red-800/30 bg-red-800/90 text-bone' : 'border-line-paper bg-ink/85 text-bone',
  ].join(' ');
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-in'));
  window.setTimeout(() => {
    toast.classList.remove('toast-in');
    window.setTimeout(() => toast.remove(), 220);
  }, 2800);
}
