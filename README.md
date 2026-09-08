# Diapasón

Tienda y catálogo de instrumentos musicales (guitarras, teclados, vientos, percusión y
equipo de audio). Astro 4 + Tailwind CSS, salida estática, pensada para Cloudflare Pages.

## Requisitos

- Node 18.18+ (probado en 18.19). El repo incluye `.nvmrc`.
- **El catálogo, el login y los roles viven en Supabase** (Auth + Postgres + Storage) —
  necesitas un proyecto propio (ver [Base de datos y autenticación](#base-de-datos-y-autenticación)
  abajo). Sin configurarlo, el sitio compila y se ve igual, pero el catálogo, la
  búsqueda, el panel de admin y el login muestran un estado vacío/de error en vez de
  datos reales.

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
  config.ts              Nombre de la tienda, WhatsApp (individual y del carrito), moneda, menús
  data/
    categories.json      5 familias + subcategorías + textos (fijo, no editable desde el panel)
    products.json        Catálogo semilla original — ya NO se lee en runtime, solo referencia
                          histórica; se migró a Supabase con supabase/seed-products.sql
  lib/
    catalog.ts           Categorías/subcategorías (config estática)
    img.ts               Helper de URLs de Unsplash + placeholder de imagen rota
    types.ts             Category, StoreProduct (fila real de products)
    supabase/
      client.ts          Cliente único de Supabase (browser)
      auth.ts            Sesión, perfil y rol: initAuth/onAuthChange/isAdmin…
      products.ts        CRUD del catálogo: listProducts/createProduct/updateProduct/…
      reviews.ts         Reseñas: getReviewsByProduct/addReview/getRecentReviews
  components/
    CatalogListing.astro Listado por familia — hace fetch en vivo a Supabase
    CategoryTile.astro   Tile de familia con conteo de piezas en vivo
    Hero.astro            Hero de la home + bloque "Recién llegado" (producto en vivo)
    ReviewTicker.astro    Cinta en vivo con las 10 reseñas más recientes de la tienda
    AuthModal.astro       Modal de inicio de sesión / registro (dialog nativo)
    SearchModal.astro     Buscador (dialog nativo) — filtra en Supabase mientras escribes
    CartDrawer.astro      Panel del carrito: líneas, cantidades, total y WhatsApp
    ProductFormModal.astro Formulario alta/edición de producto (usado en /admin)
  layouts/Base.astro      <head>, fuentes, nav, footer, AuthModal, SearchModal, CartDrawer
  scripts/
    cart.ts               Estado del carrito (localStorage) + contador + delegación de clics
    auth-gate.ts           Guarda de rutas para /cuenta y /admin
    admin-products.ts      Tabla + alta/edición/borrado de productos en /admin
    product-render.ts      HTML de tarjeta/riel/resultado de búsqueda, compartido por todo
                            lo que renderiza productos del lado del cliente
    review-render.ts       HTML de estrellas/fila de reseña/tarjeta del ticker en vivo
  pages/
    index.astro                     Home — "novedades", ticker de reseñas y conteo de familias en vivo
    catalogo/index.astro            Todo el catálogo (en vivo)
    catalogo/[category]/index.astro Listado por familia (en vivo)
    catalogo/[category]/[sub].astro Listado por subcategoría (en vivo)
    producto/index.astro            Ficha de producto — lee ?slug= y hace fetch en vivo
    cuenta/index.astro              Cuenta del usuario (requiere sesión)
    admin/index.astro               Panel de administración (requiere rol admin)
    404.astro, sitemap.xml.ts
public/                   favicon, robots.txt, _headers (caché)
supabase/
  schema.sql              Tabla profiles + RLS (usuarios y roles)
  products.sql            Tabla products + RLS + bucket 'product-images' (catálogo)
  seed-products.sql       Los ~28 productos originales, migrados a Supabase
  reviews.sql             Tabla reviews + RLS (lectura pública, alta libre)
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

### Familias y subcategorías

Edita `src/data/categories.json` (nombre, textos, imagen de portada, subcategorías). Es
configuración fija del sitio — a propósito no se gestiona desde el panel, porque cambiar
una familia implica tocar las rutas `/catalogo/[category]/[sub]`, que son estáticas.

### Catálogo (productos)

Los productos viven en la tabla `products` de Supabase, no en un archivo del repo.
Se gestionan desde **`/admin`** (alta, edición, borrado con subida de imagen al bucket
`product-images`) — ver [Base de datos y autenticación](#base-de-datos-y-autenticación).
`src/data/products.json` sigue en el repo solo como referencia de los datos originales;
`supabase/seed-products.sql` es la migración de ese archivo a Supabase.

Si una imagen de producto falla al cargar, se muestra un marcador en el tono de las
tarjetas en vez de un ícono roto (`src/lib/img.ts`, `FELT_PLACEHOLDER`).

## Buscador

El ícono de lupa del menú abre `SearchModal.astro`: un `<dialog>` con un campo de texto
que consulta Supabase (`ilike` sobre nombre, marca y categoría) 250 ms después de la
última tecla presionada, y lista los resultados con imagen, nombre y precio. Cualquier
elemento puede reabrirlo disparando `window.dispatchEvent(new
CustomEvent('diapason:open-search'))`.

## Carrito y pedido por WhatsApp

El carrito guarda líneas completas (`id, slug, name, price, image, qty`) en
`localStorage` (`diapason:cart`) — así el panel lateral nunca necesita volver a
consultar Supabase para mostrarse. La lógica vive en `src/scripts/cart.ts`:

- `addToCart`, `updateQty`, `removeFromCart`, `clearCart` — mutan el carrito y disparan
  el evento `diapason:cart-change`, del que se suscriben el contador del ícono y el
  panel (`CartDrawer.astro`).
- Cualquier botón con `data-add-to-cart='{"id":…,"slug":…,"name":…,"price":…,"image":…}'`
  (JSON en el atributo) queda enlazado automáticamente por **delegación de eventos** —
  no hace falta volver a "conectar" botones que una vista en vivo agrega después de
  cargar la página.
- El ícono de bolsa dispara `openCartDrawer()` (o el evento `diapason:open-cart`), que
  abre el panel con el detalle, las cantidades y el total en USD.
- El botón **"Hacer pedido por WhatsApp"** arma el mensaje con `cartWhatsappLink()` en
  `src/config.ts`: una línea por producto (`cantidad × nombre — precio c/u`) y el total,
  hacia `wa.me/<SITE.whatsappNumber>`.
- No hay checkout ni cobro en línea — el pedido se cierra por WhatsApp, a propósito.

## Reseñas y ticker en vivo

Cada producto tiene su propia calificación y lista de opiniones (`/producto?slug=…`):
resumen en estrellas + promedio, formulario (1-5 estrellas, comentario, nombre —
autocompletado si hay sesión, sin pisar lo que la persona ya escribió) y el listado de
reseñas existentes. Cualquiera puede publicar una, con cuenta o sin ella (`reviews.sql`
permite `insert` a `anon` y `authenticated`); no hay edición ni borrado desde el cliente.

En la home, `ReviewTicker.astro` es una cinta horizontal en scroll continuo con las 10
reseñas más recientes de toda la tienda (`getRecentReviews`), en tarjetas translúcidas
con estrellas, extracto del comentario, autor y el nombre del producto. Se pausa al
pasar el cursor y se oculta sola si todavía no hay al menos 3 reseñas con comentario.

Al publicarse una reseña nueva, `producto/index.astro` dispara
`window.dispatchEvent(new CustomEvent('review-submitted'))`; el ticker escucha ese
evento y vuelve a consultar Supabase de inmediato, así que una reseña recién enviada
aparece en la cinta sin recargar la página (siempre que la home siga abierta en otra
pestaña o se navegue a ella después).

## Base de datos y autenticación

Login, roles y **todo el catálogo** viven en Supabase (Auth + Postgres + Storage). El
sitio sigue siendo 100% estático: tanto el catálogo como la protección de `/admin`
ocurren en el navegador (ver [Cómo protege `/admin`](#cómo-protege-admin) más abajo), no
en un servidor.

### 1. Crea el proyecto

1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com).
2. En **Settings → API** copia el `Project URL` y la `anon public` key.
3. Copia `.env.example` a `.env` y pega esos dos valores:
   ```bash
   cp .env.example .env
   ```
4. En Cloudflare Pages, agrega las mismas dos variables (**Settings → Environment
   variables**) para que el build de producción también las tenga.

### 2. Crea las tablas y los permisos

En el **SQL Editor** del proyecto, pega y ejecuta, **en este orden**:

1. [`supabase/schema.sql`](supabase/schema.sql) — tabla `public.profiles` (una fila por
   usuario, columna `role` con `'customer'` por defecto o `'admin'`), un trigger que
   crea el perfil automáticamente al registrarse, y RLS: cada quien **solo lee su propia
   fila**. A propósito no hay política de escritura desde el cliente, así nadie puede
   ponerse `role = 'admin'` a sí mismo llamando a la API directamente.
2. [`supabase/products.sql`](supabase/products.sql) — tabla `public.products` (el
   catálogo en vivo), el bucket público de Storage `product-images`, y RLS: **cualquiera
   puede leer** el catálogo (es una tienda pública), pero solo insertar/editar/borrar si
   `profiles.role = 'admin'`. Necesita haber corrido el paso 1 antes (la política
   consulta `profiles`).
3. [`supabase/seed-products.sql`](supabase/seed-products.sql) *(opcional)* — carga los
   ~28 productos originales de `src/data/products.json` para no arrancar con el catálogo
   vacío. Es seguro volver a correrlo (usa `upsert` por `slug`).
4. [`supabase/reviews.sql`](supabase/reviews.sql) — tabla `public.reviews` (FK a
   `products`) y RLS: **cualquiera puede leer y publicar** una reseña, con sesión o sin
   ella. Necesita haber corrido el paso 2 antes (la FK apunta a `products`).

Sin el paso 2, el catálogo, la búsqueda y el panel de productos muestran su estado de
error ("no se pudo cargar") en vez de romper la build o la página. Sin el paso 4, la
ficha de producto muestra "Sin opiniones todavía" y el ticker de la home se mantiene
oculto.

### 3. Crea tu primer administrador

No hay botón para esto en la interfaz, a propósito:

1. Regístrate normalmente desde el sitio (botón "Iniciar sesión" → pestaña "Crear
   cuenta").
2. En el SQL Editor de Supabase:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-correo@diapason.sv';
   ```
3. Cierra sesión y vuelve a entrar (o recarga `/admin`) para que se recargue el perfil.

### Gestionar productos desde `/admin`

Con sesión de administrador, `/admin` muestra la tabla de productos con **Editar** y
**Eliminar** por fila, y el botón **"Agregar nuevo producto"** abre un formulario
(`ProductFormModal.astro`) con nombre, marca (opcional), categoría, subcategoría
(opcional), precio en USD, descripción, stock e imagen. Al guardar
(`src/lib/supabase/products.ts`):

1. La imagen se sube al bucket `product-images` (`uploadProductImage`) y se obtiene su
   URL pública.
2. Se inserta/actualiza la fila en `products` con esa URL en `images[0]`.
3. El catálogo, la home, la búsqueda y la ficha de producto lo reflejan de inmediato —
   **sin volver a desplegar** — porque todos hacen `fetch` a Supabase al cargar.

La única pieza que sí necesita un nuevo `npm run build` + despliegue para productos
recién creados es el *sitemap* (no enumera productos, ver `sitemap.xml.ts`); la ficha en
sí (`/producto?slug=…`) funciona de inmediato porque se resuelve del lado del cliente.

### Cómo funciona el cliente

- `src/lib/supabase/client.ts` exporta el cliente único `supabase`. Si faltan las
  variables de entorno, usa valores de relleno en vez de tirar el sitio entero —
  `isSupabaseConfigured` te deja comprobarlo donde haga falta.
- `src/lib/supabase/auth.ts` mantiene la sesión y el perfil en memoria (`AuthState`) y
  los transmite con un evento del navegador (`diapason:auth-change`):
  - `initAuth()` — arranca el listener una sola vez (se llama solo, como efecto
    secundario del módulo, desde el `<script>` global en `Base.astro`).
  - `getAuthState()` / `onAuthChange(fn)` — leer el estado actual o suscribirse.
  - `isAdmin(state?)` — `true` si `profile.role === 'admin'`.
  - `signInWithPassword`, `signUp`, `signOut` — envuelven las llamadas de Supabase.
  - Toda llamada de red tiene un tope de 6 s (`withTimeout`): si Supabase no responde,
    la sesión se resuelve como "sin sesión" en vez de dejar la página cargando para
    siempre.
- `src/scripts/auth-gate.ts` (`initAuthGate`) es la guarda que usan `/cuenta` y
  `/admin`: alterna cuatro paneles (`data-gate-loading` / `-signed-out` / `-denied` /
  `-content`) dentro de un contenedor `[data-auth-gate]`, según el estado de sesión y,
  si pasas `{ requireAdmin: true }`, del rol.
- `src/components/AuthModal.astro` es el modal (un `<dialog>` nativo, con pestañas
  Iniciar sesión / Crear cuenta) que vive una sola vez en `Base.astro`. Cualquier botón
  con `data-open-auth` lo abre disparando `window.dispatchEvent(new
  CustomEvent('diapason:open-auth'))` — no hace falta importarlo ni pasarle props.

### Cómo protege `/admin`

`/admin` se genera como HTML estático igual que el resto del sitio; la guarda corre en
el navegador al cargar la página. Eso significa:

- El HTML/JS vacío de `/admin` es técnicamente descargable por cualquiera.
- Pero sin una sesión de administrador válida, Supabase (por RLS) rechaza cualquier
  intento de crear, editar o borrar un producto — así que esa página vacía no permite
  nada, aunque alguien la descargue directamente. La *lectura* del catálogo sí es
  pública a propósito (es una tienda, cualquiera debe poder ver los productos).
- Si más adelante el panel necesita otra tabla (pedidos, clientes), esa tabla nueva
  necesita su propia política de RLS (igual que `products`/`profiles`) — nunca confíes
  solo en que la página "está protegida" en el cliente.

Si en el futuro hace falta que `/admin` sea imposible de descargar sin sesión (no solo
inútil sin ella), la migración es a Astro en modo `hybrid` + adaptador de Cloudflare,
con middleware que valide la sesión por cookie antes de generar el HTML — cambia el
despliegue de "solo archivos" a "Functions" en Cloudflare Pages.

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

Checkout y pagos en línea, edición de especificaciones técnicas desde el panel (la
columna `specs` existe en la tabla pero el formulario todavía no la edita), galería de
varias imágenes por producto desde el panel (hoy sube una sola), lista de deseos
persistente, gestión de familias/subcategorías desde la interfaz, cambio de
idioma/moneda, y confirmar por correo o notificación cuando entra un pedido.

## Notas de dependencias

`@supabase/supabase-js` está fijado en `2.78.0` (sin `^`) a propósito: desde `2.79.0`
la librería exige Node ≥ 20, y este proyecto se mantiene en Node 18 (ver
`.nvmrc`/Cloudflare). Si más adelante subes el proyecto a Node 20+, puedes quitar el
pin y actualizar con `npm install @supabase/supabase-js@latest`.
