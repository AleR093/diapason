import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '@/lib/supabase/categories';
import type { StoreCategory } from '@/lib/supabase/categories';
import { escapeHtml } from '@/scripts/product-render';
import { openDialog, closeDialog } from '@/scripts/dialog-transitions';
import { showToast } from '@/scripts/toast';

/** Tells the products panel (category/subcategory dropdowns) to re-fetch and repaint. */
function notifyCategoriesChanged(): void {
  window.dispatchEvent(new CustomEvent('diapason:categories-change'));
}

export function initAdminCategories(): void {
  const listEl = document.querySelector<HTMLElement>('[data-admin-categories-list]');
  const emptyEl = document.querySelector<HTMLElement>('[data-admin-categories-empty]');
  const errorEl = document.querySelector<HTMLElement>('[data-admin-categories-error]');
  const addBtn = document.querySelector<HTMLButtonElement>('[data-open-category-form]');
  const dialog = document.querySelector<HTMLDialogElement>('#category-form-modal');
  if (!listEl || !dialog) return;

  const form = dialog.querySelector<HTMLFormElement>('[data-category-form]');
  const title = dialog.querySelector<HTMLElement>('[data-category-form-title]');
  const submitLabel = dialog.querySelector<HTMLElement>('[data-category-form-submit-label]');
  const formError = dialog.querySelector<HTMLElement>('[data-category-form-error]');
  const slugHint = dialog.querySelector<HTMLElement>('[data-category-form-slug-hint]');

  let cache: StoreCategory[] = [];
  // Which category cards have their subcategory list open — survives re-renders.
  const expanded = new Set<string>();

  function subRowHTML(sub: StoreCategory['subcategories'][number]): string {
    return `
      <li class="flex items-center justify-between gap-2 border-b border-line pb-2 text-[0.85rem]" data-sub-row="${sub.id}">
        <span>${escapeHtml(sub.name)}</span>
        <span class="flex shrink-0 gap-2">
          <button type="button" class="btn btn--link !text-[0.68rem]" data-edit-sub="${sub.id}">Editar</button>
          <button type="button" class="btn btn--link !text-[0.68rem] !text-red-800" data-delete-sub="${sub.id}">Eliminar</button>
        </span>
      </li>`;
  }

  function categoryCardHTML(c: StoreCategory): string {
    const open = expanded.has(c.id);
    return `
      <div class="border border-line" data-category-card="${c.id}">
        <div class="flex flex-wrap items-center justify-between gap-3 p-4">
          <button type="button" class="text-left" data-toggle-subs="${c.id}">
            <p class="text-[0.95rem] font-medium">${escapeHtml(c.name)}</p>
            <p class="text-[0.78rem] text-brass-ink">
              /${escapeHtml(c.slug)} · ${c.subcategories.length} ${c.subcategories.length === 1 ? 'subcategoría' : 'subcategorías'} · ${open ? 'ocultar' : 'ver'}
            </p>
          </button>
          <div class="flex shrink-0 gap-2">
            <button type="button" class="btn btn--link !text-[0.72rem]" data-edit-category="${c.id}">Editar</button>
            <button type="button" class="btn btn--link !text-[0.72rem] !text-red-800" data-delete-category="${c.id}">Eliminar</button>
          </div>
        </div>
        <div class="${open ? '' : 'hidden'} border-t border-line p-4" data-subs-panel="${c.id}">
          <ul class="flex flex-col gap-2" data-subs-list="${c.id}">
            ${c.subcategories.map(subRowHTML).join('') || '<li class="text-[0.82rem] text-brass-ink">Sin subcategorías todavía.</li>'}
          </ul>
          <button type="button" class="btn btn--outline mt-3 !text-[0.72rem]" data-add-sub="${c.id}">Agregar subcategoría</button>
        </div>
      </div>`;
  }

  function render() {
    if (!cache.length) {
      listEl!.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    listEl!.innerHTML = cache.map((c) => categoryCardHTML(c)).join('');
  }

  async function refresh() {
    const { data, error } = await listCategories();
    if (error || !data) {
      if (errorEl) errorEl.hidden = false;
      return;
    }
    if (errorEl) errorEl.hidden = true;
    cache = data;
    render();
  }

  function openForm(mode: 'create' | 'edit', category?: StoreCategory) {
    form?.reset();
    if (formError) formError.classList.add('hidden');
    if (title) title.textContent = mode === 'create' ? 'Agregar categoría' : 'Editar categoría';
    if (submitLabel) submitLabel.textContent = mode === 'create' ? 'Guardar categoría' : 'Guardar cambios';
    if (slugHint) {
      slugHint.textContent =
        mode === 'create'
          ? 'El identificador de la URL se genera solo, a partir del nombre.'
          : `Identificador actual: /${category?.slug} — no cambia aunque renombres la categoría.`;
    }

    const idInput = form?.querySelector<HTMLInputElement>('input[name="id"]');
    if (idInput) idInput.value = category?.id ?? '';

    if (category) {
      (form?.querySelector('[name="name"]') as HTMLInputElement).value = category.name;
      (form?.querySelector('[name="blurb"]') as HTMLInputElement).value = category.blurb;
      (form?.querySelector('[name="intro"]') as HTMLTextAreaElement).value = category.intro;
      (form?.querySelector('[name="heroImage"]') as HTMLInputElement).value = category.hero_image ?? '';
    }

    openDialog(dialog!);
  }

  addBtn?.addEventListener('click', () => openForm('create'));
  dialog.querySelector('[data-category-form-close]')?.addEventListener('click', () => closeDialog(dialog));
  dialog.querySelector('[data-category-form-cancel]')?.addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => dialog.removeAttribute('data-open'));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const id = String(data.get('id') || '');
    const name = String(data.get('name') || '').trim();
    const blurb = String(data.get('blurb') || '').trim();
    const intro = String(data.get('intro') || '').trim();
    const heroImage = String(data.get('heroImage') || '').trim();

    if (formError) formError.classList.add('hidden');
    if (!name) {
      if (formError) {
        formError.textContent = 'Escribe un nombre para la categoría.';
        formError.classList.remove('hidden');
      }
      return;
    }

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const input = { name, blurb, intro, heroImage };
    const { error } = id ? await updateCategory(id, input) : await createCategory(input);

    if (submitBtn) submitBtn.disabled = false;

    if (error) {
      if (formError) {
        formError.textContent = error;
        formError.classList.remove('hidden');
      }
      return;
    }

    closeDialog(dialog);
    showToast(id ? 'Categoría actualizada' : 'Categoría creada');
    notifyCategoriesChanged();
    refresh();
  });

  listEl.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    const toggleBtn = target.closest<HTMLElement>('[data-toggle-subs]');
    if (toggleBtn) {
      const id = toggleBtn.dataset.toggleSubs!;
      if (expanded.has(id)) expanded.delete(id);
      else expanded.add(id);
      render();
      return;
    }

    const editBtn = target.closest<HTMLElement>('[data-edit-category]');
    if (editBtn) {
      const category = cache.find((c) => c.id === editBtn.dataset.editCategory);
      if (category) openForm('edit', category);
      return;
    }

    const deleteBtn = target.closest<HTMLElement>('[data-delete-category]');
    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteCategory!;
      const category = cache.find((c) => c.id === id);
      if (!category) return;
      if (!confirm(`¿Eliminar "${category.name}" y sus subcategorías? Esta acción no se puede deshacer.`)) return;
      const { error } = await deleteCategory(id);
      if (error) {
        alert(error);
        return;
      }
      showToast(`"${category.name}" eliminada`);
      notifyCategoriesChanged();
      refresh();
      return;
    }

    const addSubBtn = target.closest<HTMLElement>('[data-add-sub]');
    if (addSubBtn) {
      const categoryId = addSubBtn.dataset.addSub!;
      const name = prompt('Nombre de la nueva subcategoría:');
      if (!name || !name.trim()) return;
      const { error } = await createSubcategory({ categoryId, name: name.trim() });
      if (error) {
        alert(error);
        return;
      }
      expanded.add(categoryId);
      showToast('Subcategoría creada');
      notifyCategoriesChanged();
      refresh();
      return;
    }

    const editSubBtn = target.closest<HTMLElement>('[data-edit-sub]');
    if (editSubBtn) {
      const subId = editSubBtn.dataset.editSub!;
      const sub = cache.flatMap((c) => c.subcategories).find((s) => s.id === subId);
      if (!sub) return;
      const name = prompt('Nuevo nombre de la subcategoría:', sub.name);
      if (!name || !name.trim() || name.trim() === sub.name) return;
      const { error } = await updateSubcategory(subId, name.trim());
      if (error) {
        alert(error);
        return;
      }
      showToast('Subcategoría actualizada');
      notifyCategoriesChanged();
      refresh();
      return;
    }

    const deleteSubBtn = target.closest<HTMLElement>('[data-delete-sub]');
    if (deleteSubBtn) {
      const subId = deleteSubBtn.dataset.deleteSub!;
      const sub = cache.flatMap((c) => c.subcategories).find((s) => s.id === subId);
      if (!sub) return;
      if (!confirm(`¿Eliminar la subcategoría "${sub.name}"?`)) return;
      const { error } = await deleteSubcategory(subId);
      if (error) {
        alert(error);
        return;
      }
      showToast('Subcategoría eliminada');
      notifyCategoriesChanged();
      refresh();
    }
  });

  refresh();
}
