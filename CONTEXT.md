# CONTEXT.md — A&P Refrigeración · Catálogo v2

> **Leé esto primero.** Este archivo resume todo el contexto del proyecto para que puedas continuar sin haber estado en la sesión anterior.
> Última actualización: 2026-07-21, releída contra el código real (no solo contra la versión anterior de este archivo).

---

## ¿Qué es este proyecto?

**A&P Refrigeración** es una distribuidora mayorista de repuestos y equipos de refrigeración comercial e industrial, ubicada en Buenos Aires, Argentina. Atiende principalmente a **técnicos e instaladores matriculados** de todo el país.

Este repositorio (`catalogo-ayp-v2`) es el catálogo online en producción. **Ya está deployado**: frontend en Vercel, backend en Railway (ver dominios en `Backend/src/utils/cors.js`: `catalogoayp.vercel.app`, `refrigeracionayp.com`, `www.refrigeracionayp.com`).

### Quién encarga el trabajo
El dueño del negocio y del repositorio es **Nicolomano** (GitHub: `Nicolomano`). Es una persona no técnica — sus familiares también usan el sistema. Por eso es importante que el admin sea **simple, claro y fácil de entender**. No usar tecnicismos en la UI, todo en español argentino.

Existe además `MANUAL-EMPLEADOS.md` en la raíz del repo — un manual de uso pensado para el dueño/empleados no técnicos, cubre el catálogo público y todo el panel admin paso a paso. **Está parcialmente desactualizado**: no menciona la sección de Técnicos/Instaladores ni los campos CUIT / imagen de matrícula / N° de cliente del registro service (ver más abajo). Si tocás esas áreas, actualizalo también.

---

## Stack técnico

### Frontend
- **React 19** + **Vite 7** + **TailwindCSS 4**
- Carpeta: `frontend/`
- Entry point: `frontend/src/main.jsx`
- Routing: React Router v7 (`react-router-dom`)
- HTTP: Axios (`frontend/src/api/axios.js`) — URL base via `VITE_API_URL` con fallback `http://localhost:8080/api`
- Notificaciones: `react-hot-toast`
- SEO: `react-helmet-async`
- Íconos: `lucide-react`
- Carrusel: `embla-carousel-react` + `embla-carousel-autoplay` (usado en `HeroCarousel.jsx`)
- Deploy: Vercel, con `frontend/vercel.json` (rewrite SPA `/(.*)` → `/`)

### Backend
- **Node.js** + **Express 5** + **Mongoose 8** + **MongoDB**
- Carpeta: `Backend/`
- Entry point: `Backend/app.js`
- Puerto: `process.env.PORT || 8080`
- Auth: JWT con `jsonwebtoken`, secret en `JWT_SECRET` (`Backend/src/config/config.js`)
- Config se carga desde `Backend/src/config/.env.development` o `.env.production` (según `--mode`/`NODE_ENV`, ver `Backend/src/process.js` con `commander`) — **no** desde un simple `Backend/.env`. Ambos archivos están gitignoreados (`**/.env*` en `Backend/.gitignore`) y no existen en este checkout local.
- Imágenes: **Cloudflare R2** exclusivamente (ver abajo)
- Procesamiento de imágenes: `sharp` (convierte todo a `.webp`)
- Emails transaccionales: **Resend** (`resend` npm package), no Gmail/SMTP. Ver `Backend/src/services/emailService.js`. El paquete `nodemailer` sigue en `package.json` pero ya no se usa (leftover de un intento anterior con Gmail SMTP que se abandonó por problemas de IPv6/ENETUNREACH en Railway — ver historial de commits `fix(email): ...`).
- Deploy: Railway (ver comentarios en `loadtest.js` que referencian `https://TU-BACKEND.up.railway.app/api`)

### Almacenamiento de imágenes — Solo R2
Se usa **únicamente Cloudflare R2** (compatible con S3). Cloudinary fue eliminado del código (aunque el modelo `bannerModel.js` todavía tiene un comentario obsoleto que dice "URL Cloudinary" — es solo un comentario viejo, el campo guarda URLs de R2).

Utility: `Backend/src/utils/r2.js`
```js
uploadToR2(buffer, key, mimeType)  // sube y devuelve URL pública
deleteFromR2(key)                   // borra por key
keyFromUrl(url)                     // extrae la key de una URL pública
```

Variables de entorno necesarias para R2:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=   ← URL pública del bucket (ej: https://pub-xxx.r2.dev)
```

---

## Variables de entorno necesarias

### Backend (`Backend/src/config/.env.development` y `.env.production`)
```
SERVER_PORT=8080
MONGO_URI=
JWT_SECRET=
ADMIN_NAME=
ADMIN_PASSWORD=
FRONTEND_URL=http://localhost:5173
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
RESEND_API_KEY=
EMAIL_FROM="A&P Refrigeración <noreply@refrigeracionayp.com>"
```
> `r2.js` carga su propio `.env` en base a `NODE_ENV` (no al flag `--mode` de `config.js`) — si en algún entorno difieren `NODE_ENV` y el modo de `commander`, R2 puede leer variables de un archivo distinto al resto de la app. Tenerlo en cuenta si aparecen bugs de "R2 no configurado" en producción.

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8080/api
VITE_SITE_URL=http://localhost:5173
```

---

## Diseño — Sistema de CSS variables (MUY IMPORTANTE)

Todo el diseño usa **CSS custom properties** definidas en `frontend/src/index.css`. NO usar clases de Tailwind hardcodeadas para colores — usar `style={{ color: "var(--text)" }}` o, si hace falta una clase (ej. dentro de `className` condicional), la sintaxis Tailwind con valor arbitrario `text-[var(--brand)]`.

### Variables principales (`:root`, redefinidas en `html.dark`)
```css
--bg / --surface / --surface2 / --border
--text / --text2 / --muted / --muted2
--brand / --brand-h / --brand-tint / --brand-tint-t
--hero-grad / --dark-card
--shadow / --shadow-lg
--accent / --accent-h / --accent-tint        /* naranja, usado en detalles puntuales */
--success / --success-tint / --success-border
--warning / --warning-tint
--error / --error-tint
--navbar-h / --radius-card / --radius-btn
--transition-fast / --transition-base / --transition-slow
--z-base / --z-above / --z-drawer / --z-navbar / --z-modal / --z-toast
--aurora-1 / --aurora-2 / --aurora-3          /* gradientes decorativos "aurora" */
```

### Modo claro / oscuro
- Se activa agregando/quitando la clase `dark` en el elemento `<html>`
- El toggle está en `Layout.jsx` con el hook local `useDarkMode()` (usa `localStorage`, key `"theme"`)
- En modo oscuro, `html.dark` redefine todas las variables

### Clases utilitarias reusables (todas en `index.css`)
- `.bento` — card/panel estándar (fondo `--surface`, borde, sombra, hover con `translateY`)
- `.btn-primary` — botón de acción principal
- `.input-field` — input estándar (reemplaza al patrón manual de `inputCls`/`inputStyle` en componentes más nuevos; ambos patrones conviven en el código)
- `.floating-navbar` — navbar flotante con blur, usada en `Layout.jsx`
- `.bottom-nav` / `.bottom-nav-item` — barra de navegación inferior solo mobile (Inicio, Productos, Kit, Técnicos, Pedido)
- `.skeleton`, `.skeleton-card`, `.skeleton-text`, etc. — loaders
- `.reveal`, `.reveal-left`, `.reveal-scale` (+ `.reveal-delay-1..4`) — animaciones de scroll-reveal
- `.glass-card`, `.aurora-bg` — efectos decorativos

### Patrón para inputs (usado en componentes más viejos; en los nuevos preferir `.input-field`)
```jsx
const inputCls = "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

<input className={inputCls} style={inputStyle} ... />
```

---

## Estructura de rutas (frontend)

### Rutas públicas (bajo `<Layout />`, envuelto por `PublicLayout` que chequea `maintenanceMode`)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Landing.jsx` | Página de inicio con bento grid |
| `/catalogo` | `Catalogo.jsx` | Listado de productos con filtros |
| `/product/:productCode` | `ProductDetail.jsx` | Detalle de producto |
| `/cart` | `Cart.jsx` | Carrito de compras |
| `/kit-instalacion` | `KitInstalacion.jsx` | Calculadora de kit |
| `/contacto` | `Contacto.jsx` | Contacto |
| `/register` | `Register.jsx` | Registro de usuario service |
| `/login` | `Login.jsx` | Login para usuarios service |
| `/tecnicos` | `Tecnicos.jsx` | Directorio público de técnicos/instaladores recomendados |
| `/tecnicos/:id` | `TecnicoDetalle.jsx` | Perfil público de un técnico |

Si `maintenanceMode` está activo en la config del sitio y no hay token de admin guardado, `PublicLayout` (en `App.jsx`) muestra `MaintenancePage.jsx` en vez del sitio normal — con acceso discreto a `/admin/login`.

### Rutas admin (bajo `<AdminLayout />`, protegidas con `<PrivateRoute />`)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/admin` , `/admin/dashboard` | `AdminDashboard.jsx` | Dashboard |
| `/admin/landing` | `AdminLanding.jsx` | Editor CMS de la landing |
| `/admin/banners` | `AdminBanners.jsx` | Gestión de banners |
| `/admin/tecnicos` | `AdminTecnicos.jsx` | Gestión de técnicos/instaladores |
| `/admin/products` | `AdminProducts.jsx` | Gestión de productos |
| `/admin/categories` | `AdminCategories.jsx` | Gestión de categorías |
| `/admin/install-kit` | `AdminInstallKit.jsx` | Config del kit de instalación |
| `/admin/orders` | `AdminOrders.jsx` (en `components/`, no `pages/`) | Órdenes |
| `/admin/users` | `AdminUsers.jsx` | Aprobación de usuarios service |
| `/admin/config` | `AdminConfig.jsx` | Configuración general (cotización dólar) |
| `/admin/login` | `AdminLogin.jsx` | Login del admin (ruta pública, fuera de `PrivateRoute`) |

`AdminLayout.jsx` agrupa el sidebar en 3 secciones: **Contenido** (Página de inicio, Banners, Instaladores) / **Tienda** (Productos, Categorías, Kit de instalación) / **Gestión** (Órdenes, Services, Configuración).

`PrivateRoute` solo verifica que exista un `token` en `localStorage` — no valida el `role` del JWT ni si expiró (la validación de expiración ocurre recién en el backend al llamar a un endpoint protegido).

---

## Rutas de la API (backend)

Todas bajo `/api/`:

| Prefijo | Archivo | Descripción |
|---------|---------|-------------|
| `/api/products` | `productRoute.js` | CRUD productos, upload imagen, categorías, import/export Excel |
| `/api/auth` | `authRoute.js` | `POST /register` (admin, protegido), `POST /login` (admin **y** service user, ver abajo) |
| `/api/orders` | `orderRoute.js` | Crear orden (público), listar/cambiar estado (admin) |
| `/api/banners` | `bannerRoutes.js` | Banners con upload a R2, tipo `home`/`catalog`, reorder |
| `/api/categories` | `categoryRoutes.js` | Categorías jerárquicas (árbol con `parent`/`ancestors`) |
| `/api/kits` | `kitRoutes.js` | Metadata pública del kit de instalación + cálculo de precio |
| `/api/dashboard` | `dashboardRoute.js` | Estadísticas admin |
| `/api/site-config` | `siteConfigRoutes.js` | CMS de la landing + `maintenanceMode` (GET público, PUT/POST protegidos) |
| `/api/config` | `configRoute.js` | Cotización de dólar (`exchangeRate`) + config del kit (duplica algo de `kitRoutes`) |
| `/api/users` | `userRoutes.js` | Registro/aprobación de usuarios service (**implementado**, ver abajo) |
| `/api/tecnicos` | `tecnicoRoutes.js` | CRUD de técnicos/instaladores + galería de trabajos (**implementado**, ver abajo) |

`app.js` también sirve `GET /sitemap.xml` generado dinámicamente desde los productos activos, y al conectar a Mongo dropea un índice legacy conflictivo de `productModel` (`categories`+`subcategories` combinados, rechazado por Mongo como "parallel arrays") antes de sincronizar índices.

---

## Sistema de usuarios service (IMPLEMENTADO — ya no está pendiente)

### ¿Qué es?
Los técnicos matriculados pueden registrarse en el sitio para acceder a **precios con 10% de descuento**. El admin los aprueba manualmente y les asigna un número de cliente.

### Modelo real: `Backend/src/services/models/serviceUserModel.js`
```js
name, email (unique), password (hasheado con bcrypt),
company, cuit (required), matriculaImage (URL R2, opcional),
province, phone,
clientNumber,          // asignado por el admin recién al aprobar
role: "service",
approved: Boolean,
status: "pending" | "approved" | "rejected",
rejectionReason,
```
> Nota: el campo se llama **`cuit`**, no `matricula` como decía la versión anterior de este documento. La imagen que se sube (`matriculaImage`) es la foto de la matrícula/certificado, pero el dato de texto que identifica al técnico es el CUIT.

### Endpoints (`userRoutes.js` + `serviceUserController.js`)
- `POST /api/users/register` — público, `multipart/form-data` con campo `matriculaImage` opcional (procesada con sharp → webp 1200×1200, subida a R2 en `serviceuser-matriculas/`)
- `GET /api/users?status=pending|approved|rejected|all` — admin, lista usuarios (sin password)
- `PATCH /api/users/:id/status` — admin, aprobar (requiere `clientNumber`) o rechazar (requiere `rejectionReason`); dispara un email vía Resend en ambos casos

### Login unificado (`POST /api/auth/login`, `authController.js`)
Un solo endpoint decide el flujo según el body:
- Si viene `email` → busca en `serviceUserModel`, devuelve JWT con `role: "service"` + `approved`
- Si viene `username` → busca en `userModel` (admin), devuelve JWT con `role: "admin"`

### Flujo esperado
1. Técnico se registra en `/register` (con CUIT + foto de matrícula opcional, o vía WhatsApp si no tiene matrícula — botón "No tengo matrícula" que abre `wa.me` con el `adminWhatsapp` de la config) → estado `pending`
2. Admin ve la solicitud en `/admin/users`, le asigna un **N° de cliente** y aprueba, o la rechaza con motivo → email automático al usuario (Resend)
3. Si aprobado: el técnico hace login en `/login` → ve precios con 10% de descuento en `/catalogo` y `/product/:code`
4. El precio service se calcula en el frontend: `Math.round(priceARS * 0.9)`, vía `servicePrice()` en `AuthContext`

### AuthContext (`frontend/src/Context/AuthContext.jsx`)
Provee: `serviceUser`, `loginService(email, password)`, `logoutService()`, `isServiceApproved`, `servicePrice(priceARS)`.
Guarda el JWT en `localStorage["token"]` (misma key que usa el admin) y los datos del usuario en `localStorage["ayp_service_user"]`. `logoutService()` inspecciona el `role` dentro del JWT decodificado antes de borrar el token, para no cerrar sesión del admin por error si ambos comparten navegador.

---

## Sistema de técnicos / instaladores (`/tecnicos`) — feature nueva, no existía en la versión anterior de este doc

### ¿Qué es?
Un directorio público de técnicos/instaladores recomendados por A&P (no confundir con los "usuarios service" — son entidades separadas; un técnico listado acá no necesariamente tiene una cuenta service, y viceversa). Pensado como directorio de contacto/referencia, con contacto directo por WhatsApp.

### Modelo: `Backend/src/services/models/tecnicoModel.js`
```js
name, title, photo (URL R2), zone (required), city, neighborhood,
specialties: [String], bio,
services: [{ title, desc, icon }],   // sub-schema embebido
yearsExperience, rating, reviewCount,
whatsapp,
recentWork: [String],                // URLs de galería de trabajos (máx. 12)
recommended: Boolean,
active: Boolean,
order: Number,
```

### Endpoints (`tecnicoRoutes.js` + `tecnicoController.js`)
- Público: `GET /` (paginado, filtros `zona`/`especialidad`), `GET /:id`, `GET /filters` (zonas y especialidades distintas)
- Admin: `GET /admin/all`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/toggle` (activar/desactivar), `PATCH /:id/recommend`
- Galería: `POST /:id/works` (sube foto de trabajo, máx. 12 por técnico), `DELETE /:id/works/:index`

Frontend: `Tecnicos.jsx` (listado con filtros por zona/especialidad), `TecnicoDetalle.jsx` (perfil público), `AdminTecnicos.jsx` (CRUD admin). Enlace en el navbar público (`Layout.jsx`) y en la bottom-nav mobile.

> El `MANUAL-EMPLEADOS.md` **no documenta esta sección todavía** — si el dueño pide ayuda con "Instaladores" en el admin, no vas a encontrarlo en el manual actual.

---

## CMS de la Landing (`siteConfigModel.js` — completo, con un campo nuevo)

### ¿Qué es?
El dueño puede editar el contenido de la página de inicio desde `/admin/landing` sin tocar código.

### Campos editables
- Hero: imagen de fondo, badge, título (2 líneas), subtítulo, 2 botones CTA
- Stats: 2 tarjetas de estadísticas (etiqueta, número, descripción)
- Info cards: array de tarjetas (título + descripción; el ícono es fijo en el frontend, no editable)
- Sobre nosotros: título + texto
- Contacto: dirección, teléfono, **whatsapp** (número limpio, botón flotante), **adminWhatsapp** (número separado, usado en el flujo de registro sin matrícula), horario, email, `mapsEmbed`
- Kit de instalación: título, descripción, texto del botón
- **`maintenanceMode`** (Boolean) — activa `MaintenancePage.jsx` para todo visitante sin token de admin

### Modelo: `siteConfigModel.js`
Documento singleton en MongoDB (un solo doc con `singleton_key: "main"`).

### API
- `GET /api/site-config` — público, devuelve la config actual
- `PUT /api/site-config` — protegido (admin), actualiza campos
- `POST /api/site-config/hero-image` — protegido, sube imagen hero a R2 (sharp → webp)

---

## Layout público (`Layout.jsx`)

- Navbar **flotante** (no full-width pegado arriba) con `backdrop-blur`, clase `.floating-navbar`
- Links: Inicio, Productos, Kit, **Técnicos**, Contacto (+ Admin si hay token de admin sin `serviceUser`)
- Toggle día/noche (ícono sol/luna de lucide-react)
- Pill "Soy service" cuando no hay usuario logueado; nombre + badge "Precio service" + botón logout cuando sí
- Carrito con badge de cantidad animado
- **Bottom nav mobile fijo** (`.bottom-nav`): Inicio, Productos, Kit, Técnicos, Pedido — no estaba documentado antes
- `WhatsappFloat.jsx` — botón flotante de WhatsApp
- Footer con fondo `var(--dark-card)`, con links a catálogo/kit/contacto y a login/registro

---

## AdminLayout (`AdminLayout.jsx`)

- Sidebar fijo (240px / `w-60`) con gradiente azul `#001A80 → #0033CC`, colapsable en mobile (drawer con backdrop)
- Nav agrupado en 3 secciones: **Contenido** (Página de inicio, Banners, Instaladores) / **Tienda** (Productos, Categorías, Kit de instalación) / **Gestión** (Órdenes, Services, Configuración)
- Link "Ver tienda" (abre `/` en nueva pestaña)
- Botón "Cerrar sesión" (rojo)
- Header superior con breadcrumb dinámico (`Admin > [página actual]`) calculado por prefijo de ruta

---

## Landing (`Landing.jsx`)

Diseño **bento grid** (`grid-cols-12`, `gridAutoRows: 160px`):
- Hero principal, stats (clara/oscura), info cards, categorías, productos destacados, nuevos ingresos, CTAs dobles (Kit + Sobre nosotros/contacto)

Todo el texto proviene de `siteConfig` (CMS), con valores por defecto por si la API falla. Usa `HeroCarousel.jsx` (embla-carousel) e `InstagramFeed.jsx` como componentes de soporte, y hooks `useIntersectionObserver`/`useScrollProgress` para las animaciones `.reveal`.

---

## Otras piezas relevantes

- **`ErrorBoundary.jsx`** — envuelve la app para capturar errores de render.
- **`Sidebar.jsx`** (en `components/`) — sidebar de filtros del catálogo público (distinto del sidebar de `AdminLayout`).
- **`loadtest.js`** (raíz del repo) — script de carga con k6, apunta a Railway; tiene escenarios `smoke`/`load`/`stress`. Requiere reemplazar la URL placeholder antes de correrlo.
- **Excel import/export de productos** — `productsController.js` expone `importProductsExcel`/`exportProductsExcel` (usa `xlsx`/`json2csv`), documentado en `MANUAL-EMPLEADOS.md` §8.1.

---

## Pendiente / Próximas tareas

No hay pendientes de "backend faltante" registrados en el código — los dos bloques que la versión anterior de este documento marcaba como incompletos (usuarios service, backend de técnicos no existía siquiera) **ya están implementados**. Antes de asumir que algo "falta", grepear el código: este documento se desactualiza rápido.

Zonas candidatas a revisión, a criterio del dueño:
1. **`MANUAL-EMPLEADOS.md`** no cubre Técnicos/Instaladores ni los campos CUIT/matrícula/N° de cliente del registro service — actualizarlo si se van a explicar esas pantallas a alguien no técnico.
2. **`nodemailer`** sigue en `Backend/package.json` sin usarse (Resend lo reemplazó) — candidato a limpieza si se confirma que no hay ningún código restante que lo importe.
3. Confirmar con el dueño si hay plan de deploy adicional o si Vercel/Railway ya son el estado final.

---

## Cosas que NO hacer

- **No usar Cloudinary** — fue eliminado del código. Solo R2 (ignorar comentarios viejos que lo mencionen, son residuales).
- **No hardcodear colores** en JSX — siempre usar `var(--brand)`, `var(--text)`, etc.
- **No usar `bg-ayp`, `text-gray-*`, `bg-white` hardcodeados** en componentes nuevos o editados.
- **No agregar features extra** que el owner no pidió.
- **No crear archivos nuevos** si se puede editar uno existente.
- Todo el texto de UI en **español argentino** (sin "tú", siempre "vos/usted").
- No asumir que `Backend/.env` existe — la config vive en `Backend/src/config/.env.development` / `.env.production`, y ninguno de los dos está en el checkout local (gitignoreados).

---

## Servicios externos en uso

| Servicio | Uso |
|----------|-----|
| MongoDB Atlas | Base de datos |
| Cloudflare R2 | Storage de imágenes (productos, banners, hero, técnicos, matrículas service) |
| Resend | Envío de emails transaccionales (aprobación/rechazo de usuarios service) |
| Vercel | Deploy frontend (ya en producción) |
| Railway | Deploy backend (ya en producción) |

---

## Cómo levantar en desarrollo

```bash
# Backend
cd Backend
npm install
# crear Backend/src/config/.env.development con las variables listadas arriba
npm run dev  # o node app.js

# Frontend
cd frontend
npm install
# crear frontend/.env con VITE_API_URL=http://localhost:8080/api
npm run dev
```
