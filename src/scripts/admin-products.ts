import { listCategories, type StoreCategory } from '@/lib/supabase/categories';
import { listProducts, createProduct, updateProduct, updateProductStock, deleteProduct } from '@/lib/supabase/products';
import { formatPriceJS, escapeHtml } from '@/scripts/product-render';
import { openDialog, closeDialog } from '@/scripts/dialog-transitions';
import { showToast } from '@/scripts/toast';
import { FELT_PLACEHOLDER } from '@/lib/img';
import type { StoreProduct } from '@/lib/types';

export function initAdminProducts(): void {
  const tableBody = document.querySelector<HTMLElement>('[data-admin-products-body]');
  const emptyRow = document.querySelector<HTMLElement>('[data-admin-products-empty]');
  const errorRow = document.querySelector<HTMLElement>('[data-admin-products-error]');
  const addBtn = document.querySelector<HTMLButtonElement>('[data-open-product-form]');
  const searchInput = document.querySelector<HTMLInputElement>('[data-admin-products-search]');
  const categoryFilter = document.querySelector<HTMLSelectElement>('[data-admin-products-filter]');

  const dialog = document.querySelector<HTMLDialogElement>('#product-form-modal');
  if (!tableBody || !dialog) return;

  const form = dialog.querySelector<HTMLFormElement>('[data-product-form]');
  const title = dialog.querySelector<HTMLElement>('[data-product-form-title]');
  const submitLabel = dialog.querySelector<HTMLElement>('[data-product-form-submit-label]');
  const errorEl = dialog.querySelector<HTMLElement>('[data-product-form-error]');
  const imageInput = dialog.querySelector<HTMLInputElement>('[data-product-image-input]');
  const imageHint = dialog.querySelector<HTMLElement>('[data-product-image-hint]');
  const categorySelect = dialog.querySelector<HTMLSelectElement>('[data-product-category]');
  const subcategorySelect = dialog.querySelector<HTMLSelectElement>('[data-product-subcategory]');

  let cache: StoreProduct[] = [];
  let categories: StoreCategory[] = [];

  function categoryName(slug: string): string {
    return categories.find((c) => c.slug === slug)?.name ?? slug;
  }

  function fillSubcategoryOptions(categorySlug: string, selected = '') {
    if (!subcategorySelect) return;
    const category = categories.find((c) => c.slug === categorySlug);
    subcategorySelect.innerHTML = '<option value="">Sin subcategoría</option>';
    category?.subcategories.forEach((sub) => {
      const opt = document.createElement('option');
      opt.value = sub.slug;
      opt.textContent = sub.name;
      opt.selected = sub.slug === selected;
      subcategorySelect.appendChild(opt);
    });
  }

  async function refreshCategories() {
    const { data } = await listCategories();
    categories = data ?? [];
    if (categorySelect) {
      const current = categorySelect.value;
      categorySelect.innerHTML = '<option value="" disabled>Elige una categoría</option>';
      categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.slug;
        opt.textContent = c.name;
        categorySelect.appendChild(opt);
      });
      if (categories.some((c) => c.slug === current)) {
        categorySelect.value = current;
      } else {
        categorySelect.selectedIndex = 0;
      }
    }
    if (categoryFilter) {
      const current = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
      categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.slug;
        opt.textContent = c.name;
        categoryFilter.appendChild(opt);
      });
      categoryFilter.value = categories.some((c) => c.slug === current) ? current : '';
    }
    renderTable();
  }

  categorySelect?.addEventListener('change', () => fillSubcategoryOptions(categorySelect.value));
  // A category renamed/created/deleted in the Categorías panel keeps this form and filter in sync.
  window.addEventListener('diapason:categories-change', refreshCategories);

  function visibleProducts(): StoreProduct[] {
    const term = searchInput?.value.trim().toLowerCase() ?? '';
    const category = categoryFilter?.value ?? '';
    return cache.filter((p) => {
      if (category && p.category_slug !== category) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.brand ?? '').toLowerCase().includes(term) ||
        categoryName(p.category_slug).toLowerCase().includes(term)
      );
    });
  }

  function renderTable() {
    const visible = visibleProducts();
    if (cache.length === 0) {
      tableBody!.innerHTML = '';
      if (emptyRow) emptyRow.hidden = false;
      return;
    }
    if (emptyRow) emptyRow.hidden = true;
    if (visible.length === 0) {
      tableBody!.innerHTML = `<tr><td colspan="6" class="py-6 text-[0.85rem] text-brass-ink">Nada coincide con ese filtro.</td></tr>`;
      return;
    }
    tableBody!.innerHTML = visible
      .map(
        (p) => `
      <tr class="border-b border-line" data-product-row="${p.id}">
        <td class="py-3 pr-4">
          <div class="h-12 w-10 overflow-hidden bg-felt">
            <img src="${escapeHtml(p.images[0] || FELT_PLACEHOLDER)}" alt="" class="h-full w-full object-cover" onerror="this.onerror=null;this.src='${FELT_PLACEHOLDER}'" />
          </div>
        </td>
        <td class="py-3 pr-4">
          <p class="text-[0.92rem] font-medium">${escapeHtml(p.name)}</p>
          ${p.brand ? `<p class="text-[0.78rem] text-brass-ink">${escapeHtml(p.brand)}</p>` : ''}
        </td>
        <td class="py-3 pr-4 text-[0.85rem]">${escapeHtml(categoryName(p.category_slug))}</td>
        <td class="u-tabular py-3 pr-4 text-[0.9rem]">${formatPriceJS(p.price)}</td>
        <td class="py-3 pr-4">
          <input
            type="number" min="0" step="1" value="${p.stock}"
            class="u-tabular w-16 border border-line-strong bg-bone px-2 py-1 text-[0.85rem] ${p.stock <= 0 ? 'text-red-800' : ''}"
            data-quick-stock="${p.id}"
            aria-label="Stock de ${escapeHtml(p.name)}"
          />
        </td>
        <td class="py-3 pr-4 text-right">
          <button type="button" class="btn btn--link !text-[0.72rem]" data-edit-product="${p.id}">Editar</button>
          <button type="button" class="btn btn--link !text-[0.72rem] !text-red-800" data-delete-product="${p.id}">Eliminar</button>
        </td>
      </tr>`,
      )
      .join('');
  }

  async function refresh() {
    const { data, error } = await listProducts({ limit: 200 });
    if (error) {
      if (errorRow) errorRow.hidden = false;
      return;
    }
    if (errorRow) errorRow.hidden = true;
    cache = data ?? [];
    renderTable();
    // Lets the banner's metric cards (Total Productos, Stock Bajo) refresh without a reload.
    window.dispatchEvent(new CustomEvent('diapason:products-change'));
  }

  searchInput?.addEventListener('input', renderTable);
  categoryFilter?.addEventListener('change', renderTable);

  function openForm(mode: 'create' | 'edit', product?: StoreProduct) {
    form?.reset();
    if (errorEl) errorEl.classList.add('hidden');
    if (title) title.textContent = mode === 'create' ? 'Agregar nuevo producto' : 'Editar producto';
    if (submitLabel) submitLabel.textContent = mode === 'create' ? 'Guardar producto' : 'Guardar cambios';
    if (imageInput) imageInput.required = mode === 'create';
    if (imageHint) imageHint.textContent = mode === 'create' ? '(requerida)' : '(déjala vacía para mantener la actual)';

    const idInput = form?.querySelector<HTMLInputElement>('input[name="id"]');
    if (idInput) idInput.value = product?.id ?? '';

    if (product && categorySelect) {
      categorySelect.value = product.category_slug;
      fillSubcategoryOptions(product.category_slug, product.subcategory_slug ?? '');
      (form?.querySelector('[name="name"]') as HTMLInputElement).value = product.name;
      (form?.querySelector('[name="brand"]') as HTMLInputElement).value = product.brand ?? '';
      (form?.querySelector('[name="price"]') as HTMLInputElement).value = String(product.price);
      (form?.querySelector('[name="description"]') as HTMLTextAreaElement).value = product.description ?? '';
      (form?.querySelector('[name="stock"]') as HTMLInputElement).value = String(product.stock);
    } else if (categorySelect) {
      categorySelect.selectedIndex = 0;
      fillSubcategoryOptions('');
    }

    openDialog(dialog!);
  }

  addBtn?.addEventListener('click', () => openForm('create'));

  dialog.querySelector('[data-product-form-close]')?.addEventListener('click', () => closeDialog(dialog));
  dialog.querySelector('[data-product-form-cancel]')?.addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => dialog.removeAttribute('data-open'));

  tableBody.addEventListener('click', (e) => {
    const editBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-edit-product]');
    if (editBtn) {
      const product = cache.find((p) => p.id === editBtn.dataset.editProduct);
      if (product) openForm('edit', product);
      return;
    }
    const deleteBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-delete-product]');
    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteProduct;
      const product = cache.find((p) => p.id === id);
      if (!id || !product) return;
      if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;
      deleteProduct(id).then(({ error }) => {
        if (error) {
          alert('No se pudo eliminar: ' + error);
          return;
        }
        showToast(`"${product.name}" eliminado`);
        refresh();
      });
    }
  });

  // Quick stock edit: one number input per row, no need to open the full modal.
  tableBody.addEventListener(
    'change',
    (e) => {
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-quick-stock]');
      if (!input) return;
      const id = input.dataset.quickStock!;
      const value = Math.max(0, Math.round(Number(input.value) || 0));
      input.value = String(value);
      input.disabled = true;
      updateProductStock(id, value).then(({ error }) => {
        input.disabled = false;
        if (error) {
          alert('No se pudo actualizar el stock: ' + error);
          return;
        }
        const product = cache.find((p) => p.id === id);
        if (product) product.stock = value;
        input.classList.toggle('text-red-800', value <= 0);
        showToast('Stock actualizado');
        window.dispatchEvent(new CustomEvent('diapason:products-change'));
      });
    },
    true,
  );

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const id = String(data.get('id') || '');
    const name = String(data.get('name') || '').trim();
    const price = Number(data.get('price'));
    const stock = Number(data.get('stock'));
    const description = String(data.get('description') || '').trim();
    const categorySlug = String(data.get('category') || '');
    const subcategorySlug = String(data.get('subcategory') || '') || null;
    const brand = String(data.get('brand') || '').trim() || null;
    const file = imageInput?.files?.[0] ?? null;

    if (errorEl) errorEl.classList.add('hidden');

    if (!name || !categorySlug || !description || Number.isNaN(price) || Number.isNaN(stock)) {
      if (errorEl) {
        errorEl.textContent = 'Completa nombre, categoría, precio, descripción y stock.';
        errorEl.classList.remove('hidden');
      }
      return;
    }
    if (!id && !file) {
      if (errorEl) {
        errorEl.textContent = 'Selecciona una imagen para el producto.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Guardando…';

    const input = { name, brand, categorySlug, subcategorySlug, price, description, stock };
    const { error } = id
      ? await updateProduct(id, input, file)
      : await createProduct(input, file as File);

    if (submitBtn) submitBtn.disabled = false;
    if (submitLabel) submitLabel.textContent = id ? 'Guardar cambios' : 'Guardar producto';

    if (error) {
      if (errorEl) {
        errorEl.textContent = error;
        errorEl.classList.remove('hidden');
      }
      return;
    }

    closeDialog(dialog);
    showToast(id ? 'Producto actualizado' : 'Producto creado');
    refresh();
  });

  // Categories first so the table's category names and filter options are
  // correct on the very first render, instead of flashing raw slugs.
  refreshCategories().then(() => refresh());
}
