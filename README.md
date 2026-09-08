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
    products.json        Catálogo semilla original — ya NO se lee en runtime, solo referencia
                          histórica; se migró a Supabase con supabase/seed-products.sql
  lib/
    img.ts               Helper de URLs de Unsplash + placeholder de imagen rota
    types.ts             Spec, StoreProduct (fila real de products)
    supabase/
      client.ts          Cliente único de Supabase (browser)
      auth.ts            Sesión, perfil, rol y avatar: initAuth/onAuthChange/isAdmin/updateAvatar…
      products.ts        CRUD del catálogo: listProducts/createProduct/updateProduct/…
      categories.ts      CRUD de familias: listCategories/createCategory/createSubcategory/…
      reviews.ts         Reseñas: getReviewsByProduct/addReview/getRecentReviews
  components/
    CatalogListing.astro Ficha de familia/subcategoría — sin props, lee ?categoria=&sub= y
                          hace fetch en vivo (mismo patrón que producto/index.astro)
    Hero.astro            Hero de la home + bloque "Recién llegado" (producto en vivo)
    ReviewTicker.astro    Cinta en vivo con las 10 reseñas más recientes de la tienda
    AuthModal.astro       Modal de inicio de sesión / registro (dialog nativo)
    SearchModal.astro     Buscador (dialog nativo) — filtra en Supabase mientras escribes
    CartDrawer.astro      Panel del carrito: líneas, cantidades, total y WhatsApp
    ProductFormModal.astro  Formulario alta/edición de producto (usado en /admin)
    CategoryFormModal.astro Formulario alta/edición de categoría (usado en /admin)
  layouts/Base.astro      <head>, fuentes, nav, footer, AuthModal, SearchModal, CartDrawer
  scripts/
    cart.ts               Estado del carrito (localStorage) + contador + delegación de clics
    auth-gate.ts           Guarda de rutas para /cuenta y /admin
    admin-products.ts      Tabla + alta/edición/borrado + búsqueda/filtro + stock rápido en /admin
    admin-categories.ts    Alta/edición/borrado de categorías y subcategorías en /admin
    admin-dashboard.ts     Métricas en vivo del banner de /admin (productos, reseñas…)
    product-render.ts      HTML de tarjeta/riel/resultado de búsqueda, compartido por todo
                            lo que renderiza productos del lado del cliente
    category-render.ts     HTML de tile de familia + chip de subcategoría, mismo patrón
    review-render.ts       HTML de estrellas/fila de reseña/tarjeta del ticker en vivo
    avatar-render.ts       Foto circular o iniciales — mismo markup en Nav, /cuenta y reseñas
    dialog-transitions.ts  openDialog/closeDialog: abre/cierra los <dialog> con fundido
  pages/
    index.astro            Home — familias, "novedades" y ticker de reseñas, todo en vivo
    catalogo/index.astro   Catálogo completo: sin ?categoria= muestra tiles + todo/novedades;
                            con ?categoria=(&sub=) monta <CatalogListing /> (ver arriba)
    producto/index.astro   Ficha de producto — lee ?slug= y hace fetch en vivo
    cuenta/index.astro     Cuenta del usuario (requiere sesión)
    admin/index.astro      Panel de administración (requiere rol admin)
    404.astro, sitemap.xml.ts
public/                   favicon, robots.txt, _headers (caché)
supabase/
  schema.sql              Tabla profiles + RLS (usuarios y roles)
  products.sql            Tabla products + RLS + bucket 'product-images' (catálogo)
  categories.sql          Tablas categories/subcategories + RLS + FK products.category_slug
  seed-products.sql       Los ~28 productos originales, migrados a Supabase
  reviews.sql             Tabla reviews + RLS (lectura pública, alta libre)
  avatars.sql             avatar_url en profiles/reviews + bucket 'avatars' + RPC update_my_avatar
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

### Familias, subcategorías y catálogo

Categorías, subcategorías y productos viven en Supabase, no en archivos del repo, y se
gestionan por completo desde **`/admin`** — ver
[Base de datos y autenticación](#base-de-datos-y-autenticación). Crear, renombrar o
borrar una familia (o un producto) se refleja en la tienda de inmediato, sin un nuevo
`npm run build`. `src/data/products.json` sigue en el repo solo como referencia histórica
de los datos originales; `supabase/seed-products.sql` es la migración de ese archivo.

Las páginas de familia/subcategoría (antes `/catalogo/[category]/[sub]`, generadas en
build time) ahora son una sola página client-rendered, `/catalogo?categoria=…&sub=…`
(mismo patrón que `/producto?slug=…`) — es el cambio que hace posible crear una
categoría nueva desde el panel y que tenga página al instante, a cambio de perder la URL
`/catalogo/guitarras` de antes.

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

## Fotos de perfil

Desde **`/cuenta`**, cualquier persona con sesión puede subir una foto ("Cambiar foto").
`updateAvatar()` (`src/lib/supabase/auth.ts`) sube el archivo al bucket `avatars` en
`<uid>/archivo.ext` y guarda la URL pública en `profiles.avatar_url` — no por un
`update` directo (esa tabla no tiene política de UPDATE a propósito, ver
`schema.sql`), sino por la función `update_my_avatar` (`security definer`,
`avatars.sql`), que solo puede tocar esa columna de la propia fila.

Sin foto, se muestra un círculo con las iniciales del nombre (o del correo) —
`avatarHTML()` en `src/scripts/avatar-render.ts` es el único generador de ese círculo,
usado en tres sitios:

- El ícono de cuenta del menú (`Nav.astro`), que cambia solo al iniciar/cerrar sesión.
- `/cuenta`, junto al botón para cambiar la foto.
- Cada reseña (`reviewRowHTML`/`reviewTickerCardHTML`). Como `profiles` solo lo puede
  leer su dueño, el avatar se copia a la fila de `reviews` en el momento de publicarla
  (igual que ya pasa con `author_name`) — no hay forma de unirla en vivo con `profiles`
  para mostrar la foto de otra persona.

## Transiciones de página (View Transitions)

El sitio usa las View Transitions nativas de Astro (`<ViewTransitions />` en
`Base.astro`): navegar entre páginas hace un fundido suave en vez de un corte brusco
(`src/styles/global.css`, con `prefers-reduced-motion` respetado), y la imagen de un
producto en una tarjeta del catálogo viaja hacia la ficha del producto en vez de
recargarse — ambas comparten el mismo `view-transition-name` (`product-<slug>`),
asignado a mano en `product-render.ts` y `producto/index.astro` porque esas imágenes
se generan como HTML en el cliente, no como componentes de Astro.

**Por qué casi todos los `<script>` del sitio están envueltos en
`document.addEventListener('astro:page-load', …)`:** Astro reemplaza el `<body>`
completo en cada navegación y solo vuelve a ejecutar un script si su contenido cambió
respecto a la página anterior. Eso rompe justo el patrón que usa este sitio para
`/producto?slug=…` y `/catalogo?categoria=…`: son la *misma* página con distinta
query string, así que su script nunca cambia entre una ficha y otra — sin este ajuste,
hacer clic en "también te puede interesar" no actualizaría nada. `astro:page-load` sí
se dispara siempre (en la carga inicial y en cada transición), así que toda la lógica
que depende del DOM o de `location.search` vive dentro de un `init()` re-ejecutable, no
suelta en el nivel superior del script.

Ese mismo re-ejecutarse tiene un costo: componentes compartidos con un
`window.addEventListener` propio (`AuthModal`, `SearchModal`, `CartDrawer`, el ticker de
reseñas) podrían acumular un listener por cada visita repetida a la página que los usa.
Donde eso podía romper algo visible (`showModal()` sobre un `<dialog>` ya
desconectado), la suscripción se guarda y se retira antes de crear la siguiente —
`onAuthChange`/`onCartChange`/`onOpenCartRequest` devuelven una función para
desuscribirse justo por esto. El panel de `/admin` no lo necesita: sus enlaces llevan
`data-astro-reload`, así que siempre llega por una carga de página completa.

Los `<dialog>` (login, buscador, formularios de `/admin`) y el panel del carrito abren y
cierran con una transición de 300ms (opacidad + escala/deslizamiento) en vez de aparecer
de golpe — `src/scripts/dialog-transitions.ts` (`openDialog`/`closeDialog`) sincroniza el
`showModal()`/`close()` nativo con esa animación para los `<dialog>`; el carrito usa
clases de Tailwind (`transition-all duration-300 ease-in-out`) directamente sobre su
propio marcado.

## Modo Noche (Dark Mode)

El toggle (ícono sol/luna en el Nav) alterna una clase `dark` en `<html>`,
persistida en `localStorage` (`diapason:theme`) — `src/scripts/theme.ts`
(`getTheme`/`setTheme`/`toggleTheme`/`onThemeChange`), con un
`<script is:inline>` bloqueante al inicio de `<head>` en `Base.astro` que
aplica la clase antes del primer paint (sin `prefers-color-scheme` no hay
flash del tema equivocado). `tailwind.config.mjs` tiene `darkMode: 'class'`.

La paleta no se duplicó: los tokens que representan "superficie/texto
genérico de la página" (`surface`, `surface-raised`, `surface-glass`,
`content`, y — reutilizando su mismo nombre — `felt`, `line`, `line-strong`,
`brass`, `brass-ink`) están definidos como variables CSS en
`src/styles/global.css` (`:root` para modo claro, `:root.dark` para modo
noche), así que cualquier componente que ya usaba esas clases de Tailwind
(botones, chips, tarjetas, diálogos, inputs) se adapta solo.

Los tokens **bone / paper / ink / walnut / line-paper** son la excepción
deliberada: quedan fijos siempre (no reaccionan al toggle) porque están
emparejados dentro de secciones pensadas como "isla oscura" permanente —
`MarqueeBar`, la cinta de reseñas, el pie de página, las bandas oscuras de
`index.astro`, las insignias/controles sobre una fotografía (`card-tag`, el
corazón de favoritos sobre la miniatura, el Hero) — invertir esos tokens
rompería el contraste de esas parejas. Si agregas una superficie nueva,
usa los tokens reactivos (`surface*`, `content`) salvo que estés dibujando
control sobre una foto o dentro de una de esas bandas fijas.

## Hero y Nav

El Hero (`src/components/Hero.astro`) es una sola imagen a pantalla
completa con degradado oscuro, contenido centrado encima (título,
descripción, botones y la tarjeta "Recién llegado" en vidrio esmerilado) —
deliberadamente **no** reacciona al Modo Noche: al ser una foto con su
propio scrim oscuro, ya funciona como una "isla oscura" fija (ver la
sección anterior). Tiene dos animaciones:

- **Máquina de escribir**: el título se parte en un `<span>` por letra en el
  frontmatter (tiempo de build, sin JS en el cliente) con su propio
  `animation-delay`; el CSS (`.tw-w`/`.tw-c` en `global.css`) hace el resto.
  Como las View Transitions reemplazan el `<body>` completo en cada
  navegación, el efecto se repite cada vez que se entra a "/".
  `prefers-reduced-motion` lo desactiva (todas las letras aparecen de una).
- **Scroll fade**: un listener de `scroll` (con rAF, dentro del `init()`
  ligado a `astro:page-load`) baja la opacidad de la foto y sube un scrim
  encima a medida que se hace scroll; se omite por completo bajo
  `prefers-reduced-motion`.

El Nav (`src/components/Nav.astro`) tiene tres piezas nuevas: un buscador
centrado estilo YouTube (visualmente un input, en realidad un botón que
abre `SearchModal` — no duplica esa lógica de búsqueda), el toggle de Modo
Noche, y un **dock lateral flotante** (`hidden lg:flex`, fijo al borde
derecho del viewport) que reemplaza la barra horizontal de accesos
rápidos: Categorías (abre un flyout con `SITE.nav`), Favoritos, Cuenta y
Carrito. En pantallas pequeñas esos mismos accesos siguen en el menú de
pantalla completa (`data-menu-panel`).

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
3. [`supabase/categories.sql`](supabase/categories.sql) — tablas `public.categories` y
   `public.subcategories` (con las 5 familias originales precargadas), mismo esquema de
   RLS que `products`, y cambia `products.category_slug` de una lista fija a un FK hacia
   `categories.slug` — por eso necesita haber corrido el paso 2 antes.
4. [`supabase/seed-products.sql`](supabase/seed-products.sql) *(opcional)* — carga los
   ~28 productos originales de `src/data/products.json` para no arrancar con el catálogo
   vacío. Es seguro volver a correrlo (usa `upsert` por `slug`). Necesita el paso 3
   (sus categorías ya deben existir para el FK nuevo).
5. [`supabase/reviews.sql`](supabase/reviews.sql) — tabla `public.reviews` (FK a
   `products`) y RLS: **cualquiera puede leer y publicar** una reseña, con sesión o sin
   ella. Necesita haber corrido el paso 2 antes (la FK apunta a `products`).
6. [`supabase/avatars.sql`](supabase/avatars.sql) — agrega `avatar_url` a `profiles` y a
   `reviews`, el bucket público `avatars`, y la función `update_my_avatar` (ver
   [Fotos de perfil](#fotos-de-perfil) más abajo). Necesita el paso 5 (altera `reviews`).

Sin el paso 2, el catálogo, la búsqueda y el panel de productos muestran su estado de
error ("no se pudo cargar") en vez de romper la build o la página. Sin el paso 3, el
menú y `/catalogo` no listan ninguna familia y el formulario de productos no tiene
categorías para elegir. Sin el paso 5, la ficha de producto muestra "Sin opiniones
todavía" y el ticker de la home se mantiene oculto. Sin el paso 6, subir una foto de
perfil falla con un error visible en `/cuenta`.

### 3. Crea tu primer administrador

No hay botón para esto en la interfaz, a propósito:

1. Regístrate normalmente desde el sitio (botón "Iniciar sesión" → pestaña "Crear
   cuenta").
2. En el SQL Editor de Supabase:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-correo@diapason.sv';
   ```
3. Cierra sesión y vuelve a entrar (o recarga `/admin`) para que se recargue el perfil.

### Gestionar la tienda desde `/admin`

Con sesión de administrador, el panel muestra primero un banner con la insignia
**Administrador**, el correo de la sesión y cuatro métricas en vivo (Total productos,
Total reseñas, Categorías activas, Stock bajo — umbral en
`LOW_STOCK_THRESHOLD` de `src/lib/supabase/products.ts`). Una cuenta sin rol admin ve en
su lugar un panel explícito de **Acceso denegado / Permisos insuficientes**
(`auth-gate.ts`, ver [Cómo funciona el cliente](#cómo-funciona-el-cliente)).

**Productos** — tabla con **Editar**/**Eliminar** por fila, un campo de búsqueda (nombre,
marca o categoría) y un filtro por categoría que se aplican sobre la lista ya cargada
(sin golpear Supabase por cada tecla), y un campo de **stock editable en la misma fila**
que guarda con `updateProductStock` al perder el foco — no hace falta abrir el modal
completo solo para ajustar existencias. El botón **"Agregar nuevo producto"** abre
`ProductFormModal.astro` (nombre, marca opcional, categoría/subcategoría — cargadas en
vivo desde `categories.ts`, precio, descripción, stock, imagen). Al guardar:

1. La imagen se sube al bucket `product-images` (`uploadProductImage`) y se obtiene su
   URL pública.
2. Se inserta/actualiza la fila en `products` con esa URL en `images[0]`.
3. El catálogo, la home, la búsqueda y la ficha de producto lo reflejan de inmediato —
   **sin volver a desplegar** — porque todos hacen `fetch` a Supabase al cargar.

**Categorías y subcategorías** — una tarjeta por familia con su slug, cuántas
subcategorías tiene, y **Editar**/**Eliminar**; al expandirla aparece la lista de
subcategorías con su propio **Editar**/**Eliminar** y un botón **"Agregar
subcategoría"**. El botón **"Agregar categoría"** abre `CategoryFormModal.astro`
(nombre, frase corta, texto largo, id de foto de Unsplash). El *slug* se genera solo a
partir del nombre al crear y **no cambia** si renombras después (evita romper el FK que
usan los productos); subcategorías siguen la misma regla. Cualquier alta/edición/borrado
dispara `diapason:categories-change`, que refresca al instante el desplegable de
categoría del formulario de productos y las métricas del banner.

La única pieza que sí necesita un nuevo `npm run build` + despliegue para productos o
categorías recién creadas es el *sitemap* (no los enumera, ver `sitemap.xml.ts`); tanto
la ficha de producto (`/producto?slug=…`) como la de familia (`/catalogo?categoria=…`)
funcionan de inmediato porque se resuelven del lado del cliente.

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
varias imágenes por producto desde el panel (hoy sube una sola), reordenar
categorías/subcategorías por arrastre (hoy `sort_order` solo se fija en el seed), lista
de deseos persistente, cambio de idioma/moneda, y confirmar por correo o notificación
cuando entra un pedido.

## Notas de dependencias

`@supabase/supabase-js` está fijado en `2.78.0` (sin `^`) a propósito: desde `2.79.0`
la librería exige Node ≥ 20, y este proyecto se mantiene en Node 18 (ver
`.nvmrc`/Cloudflare). Si más adelante subes el proyecto a Node 20+, puedes quitar el
pin y actualizar con `npm install @supabase/supabase-js@latest`.
