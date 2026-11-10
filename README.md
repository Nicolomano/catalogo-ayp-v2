# Catálogo A&P v2 · refrigeracionayp.com

Catálogo online y sistema de pedidos de **A&P Refrigeración**, una casa de repuestos de
refrigeración de Buenos Aires. En producción en **[refrigeracionayp.com](https://refrigeracionayp.com)**,
con más de 3.900 productos.

Caso de estudio completo (problema, decisiones y capturas):
[nicolasromano.vercel.app/proyectos/catalogo-avanzado](https://nicolasromano.vercel.app/proyectos/catalogo-avanzado)

> **English:** Online catalog and ordering system for a refrigeration parts store, in
> production with 3,900+ products. Typo-tolerant search (Damerau-Levenshtein), technician
> sign-up with license verification, WhatsApp orders priced on the server, server-rendered
> pages for SEO and 199 automated tests.
> [Read the case study](https://nicolasromano.vercel.app/en/projects/catalogo-avanzado).

## Qué hace

- **Buscador tolerante a errores.** Corrige hacia palabras que existen en el catálogo
  (“lokring” → lockring, “tecunse” → tecumseh) y entiende las abreviaturas del sistema
  contable (“MOTOC.”, “FILCAP”).
- **Registro de técnicos** con validación de matrícula (foto o PDF), flujo de aprobación y
  10% de descuento calculado en el servidor.
- **Pedidos por WhatsApp** con el precio recalculado en el servidor, sin confiar en lo que
  manda el navegador.
- **Combos** con precio en tiempo real. El pedido llega con el desglose de códigos para
  facturar, porque el sistema contable no maneja combos.
- **Importación desde el Excel del sistema contable**, con vista previa y protección contra
  borrados accidentales.
- **Panel de administración** con dos niveles de acceso, métricas de visitas y búsquedas, y
  gestión de banners, destacados y categorías.

## Decisiones técnicas

- **SEO en una SPA.** Google no scrollea, así que solo veía 24 productos por categoría. Para
  los buscadores y las redes hay páginas renderizadas en el servidor (`frontend/api/`, Vercel
  Functions) con el mismo contenido que ve el usuario, datos estructurados (Product,
  BreadcrumbList, Store) y un sitemap dinámico. Search Console descubrió 3.889 páginas.
- **Corrector de búsqueda** con distancia de Damerau-Levenshtein contra un vocabulario armado
  desde el propio catálogo y cacheado en memoria.
- **Seguridad:** autenticación JWT con revocación de sesiones, protección contra inyección
  NoSQL, validación de paginación y límites en los parámetros de consulta.
- **Importación masiva** con `bulkWrite` de Mongoose en lotes de 500, para no cortar por timeout.
- **Imágenes** optimizadas a WebP con sharp y servidas desde Cloudflare R2.

## Stack

| Parte | Tecnologías |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router · deploy en Vercel |
| SEO | Vercel Functions (`frontend/api/`): páginas para buscadores y sitemap |
| Backend | Node.js, Express 5, MongoDB + Mongoose, JWT · deploy en Railway |
| Archivos y mails | Cloudflare R2 (S3), sharp, Resend |
| Pruebas | Scripts con `node` y `mongodb-memory-server` (base en memoria descartable) |

## Estructura

```
Backend/
  src/config/       configuración y variables de entorno
  src/routes/       rutas de la API
  src/controllers/  lógica de cada endpoint
  src/services/     modelos de Mongoose y acceso a datos
  src/middlewares/  autenticación, validación, límites
  src/scripts/      pruebas (__test-*.mjs) y scripts de mantenimiento
frontend/
  src/              aplicación React (pages, components, hooks, api, Context)
  api/              Vercel Functions: páginas para buscadores y sitemap.xml
  scripts/          prueba de las páginas de SEO
scripts/            verificaciones contra producción
loadtest.js         prueba de carga con k6
```

## Cómo correrlo

Requiere Node.js y una base de MongoDB (local o Atlas).

**Backend**

```bash
cd Backend
npm install
# crear src/config/.env.development con las variables de abajo
npm run dev
```

Variables: `MONGO_URI`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`, `ADMIN_NAME`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `RESEND_API_KEY`, `EMAIL_FROM` y, para las imágenes, `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL y VITE_SITE_URL
npm run dev
```

## Pruebas

199 pruebas en total. Las del backend corren contra una base en memoria sembrada con datos
reales del catálogo, así que no tocan producción.

```bash
# Backend: 8 suites, 171 pruebas (necesitan mongodb-memory-server)
cd Backend
npm install --no-save mongodb-memory-server
node src/scripts/__test-busqueda.mjs     # y el resto de src/scripts/__test-*.mjs

# SEO: 28 pruebas de las páginas para buscadores (solo lectura contra la API de producción)
cd frontend
node scripts/__test-seo.mjs
```

## Documentación del proyecto

- `CONTEXT.md`: arquitectura y decisiones.
- `ESTADO.md`: estado actual y lo último que se hizo.
- `PLAN-MEJORAS.md`: próximos pasos.
- `MANUAL-EMPLEADOS.md`: guía de uso para el personal del local.

## Autor

Nicolás Romano · [nicolasromano.vercel.app](https://nicolasromano.vercel.app) ·
[LinkedIn](https://www.linkedin.com/in/nicolasromano3515)
