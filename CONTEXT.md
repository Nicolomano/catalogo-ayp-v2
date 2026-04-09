# CONTEXT.md — A&P Refrigeración · Catálogo v2

> **Leé esto primero.** Este archivo resume todo el contexto del proyecto para que puedas continuar sin haber estado en la sesión anterior.

---

## ¿Qué es este proyecto?

**A&P Refrigeración** es una distribuidora mayorista de repuestos y equipos de refrigeración comercial e industrial, ubicada en Buenos Aires, Argentina. Atiende principalmente a **técnicos e instaladores matriculados** de todo el país.

Este repositorio (`catalogo-ayp-v2`) es una **versión nueva y limpia** del catálogo online, migrada desde `Nicolomano/catalogoAyp`. El código fue completamente rediseñado en la sesión anterior.

### Quién encarga el trabajo
El dueño del negocio y del repositorio es **Nicolomano** (GitHub: `Nicolomano`). Es una persona no técnica — sus familiares también usan el sistema. Por eso es importante que el admin sea **simple, claro y fácil de entender**. No usar tecnicismos en la UI, todo en español argentino.

---

## Stack técnico

### Frontend
- **React 19** + **Vite** + **TailwindCSS 4**
- Carpeta: `frontend/`
- Entry point: `frontend/src/main.jsx`
- Routing: React Router v6
- HTTP: Axios (`frontend/src/api/axios.js`) — URL base via `VITE_API_URL` con fallback `http://localhost:8080/api`
- Notificaciones: `react-hot-toast`
- SEO: `react-helmet-async`
- Íconos: `lucide-react`

### Backend
- **Node.js** + **Express 5** + **Mongoose** + **MongoDB**
- Carpeta: `Backend/`
- Entry point: `Backend/app.js`
- Puerto: `process.env.PORT || 8080`
- Auth: JWT con `jsonwebtoken`, secret en `JWT_SECRET`
- Imágenes: **Cloudflare R2** exclusivamente (ver abajo)
- Procesamiento de imágenes: `sharp` (convierte todo a `.webp`)

### Almacenamiento de imágenes — Solo R2
Se usa **únicamente Cloudflare R2** (compatible con S3). Cloudinary fue eliminado completamente.

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

### Backend (`Backend/.env`)
```
MONGO_URI=
JWT_SECRET=
ADMIN_NAME=
ADMIN_PASSWORD=
SERVER_PORT=8080
FRONTEND_URL=http://localhost:5173
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8080/api
VITE_SITE_URL=http://localhost:5173
```

---

## Diseño — Sistema de CSS variables (MUY IMPORTANTE)

Todo el diseño usa **CSS custom properties** definidas en `frontend/src/index.css`. NO usar clases de Tailwind hardcodeadas para colores — siempre usar `style={{ color: "var(--text)" }}` o similar.

### Variables principales
```css
--bg           /* fondo de página */
--surface      /* fondo de cards/panels */
--surface2     /* fondo de inputs */
--border       /* bordes */
--text         /* texto principal */
--muted        /* texto secundario */
--brand        /* azul #0033CC */
--brand-h      /* azul hover #0029A8 */
--brand-tint   /* azul muy claro para fondos de badges */
--hero-grad    /* gradiente azul del hero */
--dark-card    /* azul oscuro #001A80 */
--shadow       /* sombra suave */
--shadow-lg    /* sombra grande */
```

### Modo claro / oscuro
- Se activa agregando/quitando la clase `dark` en el elemento `<html>`
- El toggle está en `Layout.jsx` con el hook `useDarkMode()` (usa `localStorage`)
- En modo oscuro, `html.dark` redefine todas las variables

### Clase `.bento`
La clase utilitaria más usada. Define el estilo de card/panel:
```css
.bento {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.bento:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
```

### Patrón para inputs (usar siempre este)
```jsx
const inputCls = "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

<input className={inputCls} style={inputStyle} ... />
```

---

## Estructura de rutas (frontend)

### Rutas públicas (bajo `<Layout />`)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Landing.jsx` | Página de inicio con bento grid |
| `/catalogo` | `Catalogo.jsx` | Listado de productos con filtros |
| `/product/:productCode` | `ProductDetail.jsx` | Detalle de producto |
| `/cart` | `Cart.jsx` | Carrito de compras |
| `/kit-instalacion` | `KitInstalacion.jsx` | Calculadora de kit |
| `/contacto` | `Contacto.jsx` | Contacto |
| `/login` | `Login.jsx` | Login para usuarios service |
| `/register` | `Register.jsx` | Registro para usuarios service |

### Rutas admin (bajo `<AdminLayout />`, protegidas con `<PrivateRoute />`)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/admin` | `AdminDashboard.jsx` | Dashboard |
| `/admin/landing` | `AdminLanding.jsx` | Editor CMS de la landing |
| `/admin/products` | `AdminProducts.jsx` | Gestión de productos |
| `/admin/categories` | `AdminCategories.jsx` | Gestión de categorías |
| `/admin/banners` | `AdminBanners.jsx` | Gestión de banners |
| `/admin/orders` | `AdminOrders.jsx` | Órdenes |
| `/admin/users` | `AdminUsers.jsx` | Gestión de usuarios service |
| `/admin/config` | `AdminConfig.jsx` | Configuración del sitio |
| `/admin/install-kit` | `AdminInstallKit.jsx` | Kit de instalación |
| `/admin/login` | `AdminLogin.jsx` | Login del admin (separado) |

---

## Rutas de la API (backend)

Todas bajo `/api/`:

| Prefijo | Archivo | Descripción |
|---------|---------|-------------|
| `/api/products` | `productRoute.js` | CRUD productos, upload imagen, categorías |
| `/api/auth` | `authRoute.js` | Login/register **solo admin** (username+password) |
| `/api/orders` | `orderRoute.js` | Órdenes |
| `/api/banners` | `bannerRoutes.js` | Banners con upload a R2 |
| `/api/categories` | `categoryRoutes.js` | Categorías jerárquicas |
| `/api/kits` | `kitRoutes.js` | Kit de instalación |
| `/api/dashboard` | `dashboardRoute.js` | Estadísticas admin |
| `/api/site-config` | `siteConfigRoutes.js` | CMS de la landing (GET público, PUT/POST protegidos) |
| `/api/config` | `configRoute.js` | Configuración general |

**FALTAN estas rutas (pendiente de implementar):**
- `POST /api/users/register` — registro de usuario service
- `POST /api/auth/login` actualizado para usuarios service (con `email` + `role` + `approved`)
- `GET /api/users` — listar usuarios service (admin)
- `PATCH /api/users/:id/status` — aprobar/rechazar usuario service (admin)

---

## Sistema de usuarios service (PARCIALMENTE IMPLEMENTADO)

### ¿Qué es?
Los técnicos matriculados pueden registrarse en el sitio para acceder a **precios con 10% de descuento**. El admin los aprueba manualmente.

### Estado actual
- **Frontend completo:** `Login.jsx`, `Register.jsx`, `AuthContext.jsx`, `AdminUsers.jsx`
- **Backend INCOMPLETO:** El modelo de usuario actual (`userModel.js`) solo tiene `username` + `password` para admin. Falta un modelo `ServiceUser` (o extender el existente) con los campos del servicio.

### Campos necesarios en el modelo de usuario service
```js
name, email, password, company, matricula, province, phone,
role: { type: String, default: "service" },
approved: { type: Boolean, default: false },
status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
rejectionReason: String
```

### Flujo esperado
1. Técnico se registra en `/register` → estado `pending`
2. Admin ve la solicitud en `/admin/users` y aprueba/rechaza
3. Si aprobado: el técnico hace login en `/login` → ve precios con 10% de descuento en `/catalogo` y `/product/:code`
4. El precio service se calcula en el frontend: `Math.round(priceARS * 0.9)`

### AuthContext (`frontend/src/Context/AuthContext.jsx`)
Provee:
- `serviceUser` — objeto del usuario logueado (o null)
- `loginService(email, password)` — llama a `POST /api/auth/login`
- `logoutService()` — limpia localStorage
- `isServiceApproved` — booleano
- `servicePrice(priceARS)` — calcula precio con descuento

---

## CMS de la Landing (COMPLETO)

### ¿Qué es?
El dueño puede editar el contenido de la página de inicio desde `/admin/landing` sin tocar código.

### Campos editables
- Hero: imagen de fondo, badge, título (2 líneas), subtítulo, 2 botones CTA
- Stats: 2 tarjetas de estadísticas (etiqueta, número, descripción)
- Info cards: 4 tarjetas con ícono fijo (título + descripción)
- Sobre nosotros: título + texto
- Contacto: dirección, teléfono, horario
- Kit de instalación: título, descripción, texto del botón

### Modelo: `siteConfigModel.js`
Documento singleton en MongoDB (un solo doc con `singleton_key: "main"`).

### API
- `GET /api/site-config` — público, devuelve la config actual
- `PUT /api/site-config` — protegido (admin), actualiza campos
- `POST /api/site-config/hero-image` — protegido, sube imagen hero a R2 (sharp → webp 1500×600)

---

## Layout público (`Layout.jsx`)

- Navbar translúcido con `backdrop-blur`
- Toggle día/noche (ícono sol/luna de lucide-react)
- Muestra "Soy service" pill cuando el usuario no está logueado
- Muestra nombre del usuario service + botón logout cuando está logueado
- Carrito con badge de cantidad
- Footer con fondo `var(--dark-card)` (azul oscuro)

---

## AdminLayout (`AdminLayout.jsx`)

- Sidebar fijo (240px) con gradiente azul `#001A80 → #0033CC`
- Nav agrupado en 3 secciones: **Contenido** / **Catálogo** / **Gestión**
- Íconos de lucide-react para cada item
- Link "Ver catálogo" (abre en nueva pestaña)
- Botón "Cerrar sesión" (rojo)
- Header superior con breadcrumb dinámico (`Admin > [página actual]`)

---

## Landing (`Landing.jsx`)

Diseño **bento grid** (`grid-cols-12`, `gridAutoRows: 160px`):
- Hero principal: `col-span-8 row-span-2` — fondo con imagen o gradiente
- Stat 1 (clara): `col-span-4 row-span-1`
- Stat 2 (oscura): `col-span-4 row-span-1`
- Info cards: 4 tarjetas con íconos fijos
- Categorías: grid de links por categoría
- Productos destacados: grid de cards
- Nuevos ingresos: grid de cards
- CTAs dobles: Kit de instalación + Sobre nosotros/contacto

Todo el texto proviene de `siteConfig` (CMS). Hay valores por defecto en caso de que la API falle.

---

## Pendiente / Próximas tareas

### Alta prioridad
1. **Backend de usuarios service** — crear modelo `ServiceUser`, rutas `POST /users/register`, actualizar `POST /auth/login` para soportar email+role+approved, `GET /users`, `PATCH /users/:id/status`
2. **Revisar páginas admin** — `AdminUsers.jsx`, `AdminBanners.jsx`, `AdminProducts.jsx`, etc. todavía tienen estilos viejos (Tailwind hardcodeado con `text-gray-*`, `bg-white`, etc.). Migrar a CSS variables

### Media prioridad
3. **Página de inicio (`/`)** — revisar que el hero y las secciones se vean bien con datos reales
4. **AdminLogin.jsx** — probablemente tiene estilo viejo, revisar
5. **KitInstalacion.jsx** y **Contacto.jsx** — revisar estilos

### Baja prioridad
6. **Deploy** — cuando el owner lo decida: frontend en Vercel, backend en Railway, mismas variables de entorno que el proyecto anterior pero apuntando a `catalogo-ayp-v2`

---

## Cosas que NO hacer

- **No usar Cloudinary** — fue eliminado completamente. Solo R2.
- **No hardcodear colores** en JSX — siempre usar `var(--brand)`, `var(--text)`, etc.
- **No usar `bg-ayp`, `text-gray-*`, `bg-white` hardcodeados** en componentes nuevos o editados
- **No agregar features extra** que el owner no pidió
- **No crear archivos nuevos** si se puede editar uno existente
- Todo el texto de UI en **español argentino** (sin "tú", siempre "vos/usted")

---

## Servicios externos en uso

| Servicio | Uso |
|----------|-----|
| MongoDB Atlas | Base de datos |
| Cloudflare R2 | Storage de imágenes (productos, banners, hero) |
| Vercel | Deploy frontend (cuando se haga) |
| Railway | Deploy backend (cuando se haga) |

---

## Cómo levantar en desarrollo

```bash
# Backend
cd Backend
npm install
# crear Backend/.env con las variables listadas arriba
npm run dev  # o node app.js

# Frontend
cd frontend
npm install
# crear frontend/.env con VITE_API_URL=http://localhost:8080/api
npm run dev
```
