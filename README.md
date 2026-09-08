# Diapasón

Tienda y catálogo de instrumentos musicales (guitarras, teclados, vientos, percusión y
equipo de audio). Astro 4 + Tailwind CSS, salida estática, pensada para Cloudflare Pages.

## Requisitos

- Node 18.18+ (probado en 18.19). El repo incluye `.nvmrc`.
- El catálogo vive en `src/data/*.json` (no necesita base de datos).
- Login y roles usan **Supabase Auth** — necesitas un proyecto de Supabase (ver
  [Autenticación](#autenticación) abajo). Sin configurarlo, el resto del sitio funciona
  igual; solo el inicio de sesión queda inactivo.

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
    AuthModal.astro       Modal de inicio de sesión / registro (dialog nativo)
  layouts/Base.astro      <head>, fuentes, barra superior, nav, footer y AuthModal
  lib/supabase/
    client.ts             Cliente único de Supabase (browser)
    auth.ts               Sesión, perfil y rol: initAuth/onAuthChange/isAdmin…
  scripts/
    cart.ts               Carrito visual (localStorage)
    auth-gate.ts           Guarda de rutas para /cuenta y /admin
  pages/
    index.astro                     Home
    catalogo/index.astro            Todo el catálogo
    catalogo/[category]/index.astro Listado por familia
    catalogo/[category]/[sub].astro Listado por subcategoría
    producto/[slug].astro           Ficha de producto
    cuenta/index.astro              Cuenta del usuario (requiere sesión)
    admin/index.astro               Panel de administración (requiere rol admin)
    404.astro, sitemap.xml.ts
public/                   favicon, robots.txt, _headers (caché)
supabase/schema.sql        SQL para crear la tabla profiles + RLS (pégalo en Supabase)
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

## Autenticación

Login, registro y rol de administrador usan **Supabase Auth**. El sitio sigue siendo
100% estático: la protección de `/admin` ocurre en el navegador (ver
[Cómo protege `/admin`](#cómo-protege-admin) más abajo), no en un servidor.

### 1. Crea el proyecto

1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com).
2. En **Settings → API** copia el `Project URL` y la `anon public` key.
3. Copia `.env.example` a `.env` y pega esos dos valores:
   ```bash
   cp .env.example .env
   ```
4. En Cloudflare Pages, agrega las mismas dos variables (**Settings → Environment
   variables**) para que el build de producción también las tenga.

### 2. Crea la tabla `profiles` y los permisos

Pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) en el **SQL Editor**
del proyecto y ejecútalo. Eso crea:

- `public.profiles` — una fila por usuario, con columna `role` (`'customer'` por
  defecto, o `'admin'`).
- Un trigger que crea el perfil automáticamente cuando alguien se registra.
- Row Level Security: cada usuario **solo puede leer su propia fila**. A propósito no
  hay política de escritura desde el cliente, así nadie puede ponerse `role = 'admin'`
  a sí mismo llamando a la API directamente.

### 3. Crea tu primer administrador

No hay botón para esto en la interfaz, a propósito:

1. Regístrate normalmente desde el sitio (botón "Iniciar sesión" → pestaña "Crear
   cuenta").
2. En el SQL Editor de Supabase:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-correo@diapason.sv';
   ```
3. Cierra sesión y vuelve a entrar (o recarga `/admin`) para que se recargue el perfil.

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
- Pero sin una sesión válida, Supabase (por RLS) no entrega ninguna fila de
  `profiles` ni de ninguna otra tabla — así que esa página vacía no expone datos.
- Si más adelante el panel necesita consultar productos, pedidos o clientes reales,
  cada tabla nueva necesita su propia política de RLS (igual que `profiles`), nunca
  confíes solo en que la página "está protegida" en el cliente.

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

Checkout y pagos, CRUD real en el panel de administración (hoy es una vista de
ejemplo), lista de deseos persistente, cambio de idioma/moneda, CMS y fotografía de
producto propia.

## Notas de dependencias

`@supabase/supabase-js` está fijado en `2.78.0` (sin `^`) a propósito: desde `2.79.0`
la librería exige Node ≥ 20, y este proyecto se mantiene en Node 18 (ver
`.nvmrc`/Cloudflare). Si más adelante subes el proyecto a Node 20+, puedes quitar el
pin y actualizar con `npm install @supabase/supabase-js@latest`.
