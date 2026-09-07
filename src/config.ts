import type { Product } from '@/lib/types';

/**
 * Single source of truth for store-wide settings.
 * Rename the shop, set the WhatsApp number, and edit link lists here.
 */
export const SITE = {
  /** Store name. Change this one value to rebrand the wordmark, titles and messages. */
  name: 'Diapasón',
  tagline: 'Instrumentos y equipo para quien toca en serio.',
  description:
    'Tienda y catálogo de guitarras, teclados, vientos, percusión y equipo de audio. ' +
    'Especificaciones claras, taller propio y atención directa por WhatsApp.',

  /**
   * WhatsApp number in international format, digits only (country code + number),
   * e.g. '50375524443'. Leave empty and the CTA will point to a visible TODO.
   */
  whatsappNumber: '50375524443',

  /** Currency + locale used by formatPrice(). El Salvador uses the US dollar. */
  currency: 'USD',
  locale: 'es-SV',

  /** Rotating messages in the top bar. Keep them short. */
  marquee: [
    'Envío a todo El Salvador',
    'Taller de ajuste propio',
    '40 años afinando instrumentos',
    'Atención directa por WhatsApp',
  ],

  email: 'hola@diapason.sv',
  phone: '+503 7552-4443',

  nav: [
    { label: 'Guitarras', href: '/catalogo/guitarras' },
    { label: 'Teclados', href: '/catalogo/teclados' },
    { label: 'Vientos', href: '/catalogo/vientos' },
    { label: 'Percusión', href: '/catalogo/percusion' },
    { label: 'Audio', href: '/catalogo/audio' },
  ],

  footer: {
    Comprar: [
      { label: 'Todo el catálogo', href: '/catalogo' },
      { label: 'Guitarras', href: '/catalogo/guitarras' },
      { label: 'Teclados', href: '/catalogo/teclados' },
      { label: 'Novedades', href: '/catalogo?filtro=nuevos' },
    ],
    Taller: [
      { label: 'Ajuste y setup', href: '/catalogo' },
      { label: 'Reparaciones', href: '/catalogo' },
      { label: 'Cómo elegimos cada pieza', href: '/#seleccion' },
    ],
    Ayuda: [
      { label: 'Consultar por WhatsApp', href: '/catalogo' },
      { label: 'Envíos y entregas', href: '/catalogo' },
      { label: 'Garantía', href: '/catalogo' },
      { label: 'Contacto', href: '/catalogo' },
    ],
  } as Record<string, { label: string; href: string }[]>,

  social: [
    { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' as const },
    { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' as const },
    { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' as const },
  ],
};

const priceFormatter = new Intl.NumberFormat(SITE.locale, {
  style: 'currency',
  currency: SITE.currency,
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

/** Build a wa.me link with a prefilled message. Falls back to a TODO anchor. */
export function whatsappLink(product?: Pick<Product, 'name' | 'brand'>): string {
  const base = product
    ? `Hola, me interesa el ${product.brand} ${product.name}. ¿Tienen disponibilidad?`
    : `Hola, quiero información sobre un instrumento del catálogo.`;
  if (!SITE.whatsappNumber) {
    // Visible reminder that the number is not set yet.
    return `#configura-whatsapp`;
  }
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(base)}`;
}
