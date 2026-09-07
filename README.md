# Diapasón

Tienda y catálogo de instrumentos musicales (guitarras, teclados, vientos, percusión y
equipo de audio). Astro 4 + Tailwind CSS, salida estática, pensada para Cloudflare Pages.

## Requisitos

- Node 18.18+ (probado en 18.19). El repo incluye `.nvmrc`.
- No hace falta base de datos: el catálogo vive en `src/data/*.json`.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
npm run preview    # sirve dist/ localmente
npm run check      # comprueba tipos (tsc --noEmit)
```

## Estructura

```
src/
  config.ts              Nombre de la tienda, WhatsApp, moneda, menús, redes
  data/
    categories.json      5 familias + subcategorías + textos
    products.json        ~28 productos con ficha técnica e imágenes
  lib/
    catalog.ts           Consultas sobre los datos (por categoría, relacionados…)
    img.ts               Construye las URLs de Unsplash desde un id
    types.ts             Tipos de Category y Product
  components/             Nav, Footer, ProductCard, CatalogListing, SpecsTable…
  layouts/Base.astro      <head>, fuentes, barra superior, nav y footer
  pages/
    index.astro                     Home
    catalogo/index.astro            Todo el catálogo
    catalogo/[category]/index.astro Listado por familia
    catalogo/[category]/[sub].astro Listado por subcategoría
    producto/[slug].astro           Ficha de producto
    404.astro, sitemap.xml.ts
public/                   favicon, robots.txt, _headers (caché)
```

## Qué personalizar

Todo lo editable de tienda está en **`src/config.ts`**:

| Campo | Para qué |
|---|---|
| `name` | Nombre de la marca. Cambia el wordmark, los títulos y los mensajes. |
| `whatsappNumber` | Número internacional, solo dígitos (p. ej. `5215512345678`). **Mientras esté vacío, los botones de WhatsApp apuntan a un recordatorio visible.** |
| `currency` / `locale` | Formato de precios (`Intl.NumberFormat`). |
| `marquee` | Frases de la barra superior. |
| `email`, `phone`, `nav`, `footer`, `social` | Datos de contacto y menús. |

### Catálogo

Edita `src/data/categories.json` y `src/data/products.json`. Cada producto necesita
`slug` único, `categorySlug`/`subcategorySlug` que existan en `categories.json`, `price`
(número), `stock` (`"disponible"` o `"bajo pedido"`), `story`, `specs` y `images`.

### Imágenes

`images` guarda **ids de Unsplash** (la parte que va después de `photo-`); `src/lib/img.ts`
arma la URL con el tamaño y recorte. Para usar fotos propias: sube los archivos a
`public/productos/…` y cambia en las plantillas `unsplash(id, …)` por la ruta directa
(`/productos/mi-foto.webp`). Si una imagen falla al cargar se muestra un marcador en el
tono de las tarjetas.

## Carrito

«Añadir al carrito» es **solo visual**: guarda un contador en `localStorage`
(`diapason:cart`) y lo muestra en la cabecera. No hay checkout — la compra real se cierra
por WhatsApp. La lógica está en `src/scripts/cart.ts`.

## Desplegar en Cloudflare Pages

1. Sube el repo a GitHub/GitLab y crea un proyecto de **Pages**.
2. Configuración de compilación:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variable de entorno: `NODE_VERSION = 18`
3. Antes de publicar, cambia `site` en `astro.config.mjs` y la línea `Sitemap:` de
   `public/robots.txt` por tu dominio real.

`public/_headers` ya deja los assets con hash y las fuentes en caché larga.

## Pendiente (fuera de esta entrega)

Checkout y pagos, cuentas de usuario, lista de deseos persistente, cambio de
idioma/moneda, CMS y fotografía de producto propia.
