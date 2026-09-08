/**
 * Fluid open/close for native <dialog> modals (Auth, Search, Product/Category
 * forms). Each dialog's own <style> defines the fade/scale via a `[data-open]`
 * attribute selector — this just sequences it: open instantly (native
 * showModal), then flip the attribute a frame later so the transition runs;
 * on close, fade out first and only call the native close() once that finishes,
 * so the dialog never just vanishes.
 */
export function openDialog(dialog: HTMLDialogElement): void {
  dialog.showModal();
  requestAnimationFrame(() => dialog.setAttribute('data-open', 'true'));
}

export function closeDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open) return;
  dialog.removeAttribute('data-open');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    dialog.removeEventListener('transitionend', finish);
    if (dialog.open) dialog.close();
  };
  dialog.addEventListener('transitionend', finish);
  // Safety net for reduced-motion or browsers that skip the transition.
  window.setTimeout(finish, 260);
}
