# Plan de mejoras

> Sale de la auditoría completa del **04/11/2026** (backend, frontend, operación y
> documentación). Lo crítico se arregló ese mismo día; esto es lo que queda, **en orden de
> prioridad**. Cada tanda está pensada como uno o dos commits que se prueban y despliegan
> por separado.
>
> Los números de línea son de ese día: pueden haberse corrido un poco.

## Hecho el 04/11

- ~~Backup que no se podía restaurar~~ → EJSON, prueba de ida y vuelta, `MONGO_URI` obligatoria para restaurar (`6b8bfa3`)
- ~~"Página de inicio" podía borrar WhatsApp, dirección y mapa del sitio~~ (`7251302`)
- ~~Pantalla de error con el stack después de cada deploy~~ (`c8850d6`)
- ~~Config del sitio leída de dos maneras~~ (`10d3647`)
- ~~multer 1.x y xlsx 0.18.5 con fallas conocidas~~ → `npm audit`: 0 (`f391dba`)
- ~~Importación vieja de un solo paso expuesta~~ (`7708f43`)
- ~~Bajar a un admin de nivel tardaba hasta 2 días~~ (`5187005`)
- ~~Visitas, ventas y destacados cambiaban la fecha del sitemap~~ (`1476bea`)

---

## Tanda A — Errores que ve el cliente

1. **El catálogo dice "No se encontraron productos" si la API falla**
   (`frontend/src/pages/Catalogo.jsx:194`). Lo mismo en `ProductDetail.jsx:97` ("Producto
   no encontrado"). → Estado de error con botón "Reintentar".
2. **Volver desde un producto resetea el catálogo**: se pierden búsqueda, marca, orden y
   scroll (`Catalogo.jsx:42-69`). → Llevar `q`, `marca` y `orden` a la URL; restaurar el
   scroll (sessionStorage).
3. **Los banners de la home no se ven en el celular** (`Landing.jsx:257`,
   `hidden md:block`). → Mostrarlos debajo del hero en mobile (`aspect-[2/1]`).
4. **La home muestra "+54 11 XXXX-XXXX" y "Dirección del local"** mientras carga o si falla
   (`Landing.jsx:51`). → Arrancar con campos vacíos.
5. **"No tengo matrícula" abre WhatsApp a un número que no existe** (`Register.jsx:67`,
   `5491100000000`). → Usar el WhatsApp del sitio, o esconder el botón.
6. **Técnico con la sesión vencida (7 días)** sigue viendo su nombre pero pierde el precio
   service sin aviso (`Context/AuthContext.jsx`). → Detectar el vencimiento, limpiar y
   avisar "Tu sesión venció".
7. **Kit de instalación:**
   - Frontend (`KitInstalacion.jsx`): un pedido por cada "+" sin debounce y con respuestas
     desordenadas (`:87`); texto de WhatsApp sin `encodeURIComponent` (`:96`); skeleton
     infinito si falla la carga (`:51`).
   - Backend (`kitController.js:13,65`): cotiza con la lógica del dólar vieja (puede dar $0)
     y cotiza productos sin stock. → Usar `priceARS` y saltear sin stock, como los pedidos.
8. **Carrito** (`Cart.jsx`): "Vaciar" sin confirmación (`:296`); sin tope de cantidad (el
   backend descarta >999 sin avisar); `clearCart()` borra también lo que el pedido descartó
   (`:121`).
9. **El sitemap puede quedar sin productos 24 h** si la API tarda (`api/sitemap.js:57,67`).
   → Si falla, `s-maxage` corto.

## Tanda B — Panel de admin

1. **Diálogo de confirmar: Enter siempre confirma**, aunque el foco esté en "Cancelar"
   (`Context/ConfirmContext.jsx:31`). Peligroso en "Eliminar" de la importación. → Sacar el
   Enter global; foco en Cancelar cuando es destructivo.
2. **Doble envío y fallas silenciosas**: banners (`AdminBanners.jsx:31,64-85`) y productos
   (`AdminProducts.jsx:567`) sin "guardando…"; borrar/activar banners sin try/catch. →
   Estado `saving` y mostrar `err.response?.data?.message`.
3. **Formulario de producto** (`AdminProducts.jsx`): el precio obligatorio impide editar un
   producto "Consultar precio" (`:668`); no se puede borrar la marca ni las categorías
   (`:576`); tocar una categoría borra todas las subcategorías (`:695`).
4. **Lista de productos del admin** pide dos veces al abrir y puede mostrar resultados
   viejos (`AdminProducts.jsx:120-129`). → Un solo efecto con AbortController.
5. **Órdenes** (`components/AdminOrders.jsx`): si falla la carga dice "No hay órdenes"
   (`:29`); cambiar estado falla en silencio y usa estado viejo (`:39`); el filtro por
   estado existe en el backend pero no en la pantalla.
6. **Sesión de admin vencida** recarga la página y se pierde el formulario
   (`api/axios.js:90`).
7. **El manejador de errores devuelve 500 a todo** (`Backend/app.js:87`): JSON mal
   formado, archivo grande o de tipo inválido en productos/banners. → Respetar
   `err.status` 4xx y sumar `manejarErrorDeArchivo` en `productRoute.js`,
   `bannerRoutes.js`, `siteConfigRoutes.js`.
8. **Aprobar/rechazar técnico devuelve 500 si Resend falla**, aunque el cambio se guardó
   (`utils/emailService.js:24` sin try/catch) → el admin reintenta.
9. **El modo mantenimiento bloquea también al admin** (`middlewares/maintenance.js:29`:
   `req.user` nunca está cargado ahí).

## Tanda C — Seguridad

1. **Exportar contactos de técnicos** (`userRoutes.js:32`) lo puede hacer un admin
   limitado. → `requireNivelTotal`.
2. **Banners**: `bannerController.js` guarda `{...req.body}` sin filtrar y cualquier
   `linkUrl`. → Lista de campos permitidos; solo `http(s)://` o rutas internas.
3. **Matrículas viejas en el bucket público** (`utils/r2.js:39`, campo `matriculaImage`):
   moverlas a claves aleatorias o a un bucket privado.
4. **Recuperar contraseña**: el límite de 3 por hora es compartido entre pedir el mail y
   cambiarla (`rateLimiters.js:55`); un técnico que se equivoca queda bloqueado. →
   Límites separados, sin contar los exitosos.
5. **Los mails de los destinatarios quedan en los logs** (`emailService.js:18`).
6. Menores: `sort` repetido en la URL tira 500 (`productsController.js` ~335); IDs
   inválidos dan 500 en vez de 400 (CastError); `getMatricula` hace `pipe` sin manejar
   errores (usar `stream.pipeline`); el login de admin no hace `trim` del usuario.

## Tanda D — Datos y métricas

1. **"Se miran y no se piden" cuenta robots**: las vistas previas de WhatsApp y Googlebot
   pasan por `api/og-product.js` → `/products/code/` → `views+1`. → Que la página para bots
   no sume (parámetro o endpoint aparte).
2. **El WhatsApp de cada pedido dice "Cotización aplicada: 1,00 ARS/USD"**
   (`orderController.js:215`). → Sacar la línea y los restos de USD del pedido.
3. **Métricas** (`metricsController.js`, `AdminMetrics.jsx`): técnicos "esperando info"
   fuera del embudo (`:299`); la tarjeta "Búsquedas" suma solo el top 10; vistas y pedidos
   por producto son totales históricos bajo un selector de 7/30/90 días.
4. **Borrar una pieza de un combo** no recalcula el combo guardado (`deleteProduct`).
5. **Para confirmar con el negocio:** un producto desactivado por "faltante" que vuelve en
   un Excel posterior queda desactivado (`buildUpdate` no toca `active`). ¿Es lo que se
   quiere?

## Tanda E — Operación

1. **Pruebas con un comando y CI**: `mongodb-memory-server` a devDependencies, `npm test`
   que corra todas las suites (hoy `npm test` falla), y un workflow de GitHub Actions con
   backend + lint + build del frontend.
   > Ojo: hoy `npm install` borra `mongodb-memory-server` porque está instalado con
   > `--no-save`. Pasarlo a devDependencies lo arregla.
2. **Apagado ordenado** (SIGTERM en `app.js`): un redeploy de Railway en medio de una
   importación la deja a medias.
3. **Dependencias sin uso**: backend `json2csv`, `connect-mongo`, `express-validator`;
   frontend `autoprefixer`, `postcss`; raíz `shadcn` y `loadtest.js`. Sumar
   `"engines": { "node": ">=20" }`.
4. **Imágenes huérfanas en R2**: borrar un producto o cambiarle la foto no borra el archivo
   (`deleteFromR2` está importado y sin usar en `productsController.js`).
5. **`/site-config` se pide 3 veces en la home** y 4 más en otras páginas, sin caché. → Hook
   `useSiteConfig()` (extender el caché de `hooks/useWhatsappNumber.js`) y
   `Cache-Control: max-age=60` en el backend.
6. **Backup automático**: hoy depende de acordarse. Opción: un cron de GitHub Actions que
   corra `backup.js` y lo guarde como artefacto privado (con `MONGO_URI` en los secrets).
7. **Documentación**: manual §8.11 (dice que excluye robots y que cuenta "personas
   distintas": no es así), FAQ de la cotización.

## Tanda F — Accesibilidad, rendimiento y detalles

- Botones solo con ícono sin nombre accesible: carrito, +/− y borrar del carrito, cerrar
  menú y lightbox, ver contraseña, pasos del kit. Labels sin `htmlFor`. Teléfono del
  carrito `type="tel"`. Lightbox sin Escape.
- `react-dom` cae en el chunk principal (`vite.config.js:10`, 93 KB gzip); Inter en 6
  pesos; miniaturas de 170 px que bajan imágenes de 800 px (sin `srcset`); Google
  Analytics carga antes de aceptar cookies.
- Textos: "ó 6 cuotas" → "o" (`ProductCard.jsx:130`, `ProductDetail.jsx:384`);
  "Hola!" → "¡Hola!".
- Código repetido: ícono de WhatsApp ×3 (existe `WhatsappIcon.jsx`), `SITE_URL` ×5.
- ESLint: los 2 `catch` vacíos de `HeroCarousel.jsx` son errores reales.

---

## Mejoras de funcionalidad (propuestas, no errores)

En orden de valor para el negocio. Todas reutilizan código que ya existe.

1. **Mail al admin cuando entra un pedido.** Hoy solo existe el WhatsApp, y si el cliente
   no lo manda el pedido queda solo en el panel. `sendMail` + una plantilla, después de
   `newOrder.save()` (`orderController.js:180`).
2. **Botón "Responder por WhatsApp" en Órdenes** (`wa.me/<teléfono del cliente>`) y filtro
   por estado.
3. **Más estados de pedido** (`pendiente / presupuestado / facturado / cancelado`):
   "Facturación" y "Más vendidos" pasan a contar ventas y no intenciones.
4. **Pedidos de técnicos identificados + "Mis pedidos"**: guardar `serviceUserId` en la
   orden (`esServiceAprobado` ya lo valida) y `GET /orders/mine`.
5. **"Avisame cuando haya stock"**: la importación ya sabe qué productos volvieron a tener
   stock (solo escribe lo que cambió). Ojo con el límite de 100 mails/día de Resend.
6. **Lista de precios para técnicos** en Excel, reutilizando el exportador.
7. **Descuento service configurable** desde el panel (hoy es 10% fijo en
   `orderController.js:12`).

## Cómo verificar cada tanda

- Backend: las 8 suites (`node src/scripts/__test-*.mjs`, 171 pruebas al 04/11) más las
  pruebas nuevas de lo que se toque.
- Frontend: `npm run lint` (15 avisos es lo normal), `npm run build`,
  `node scripts/__test-seo.mjs`.
- En producción: home, catálogo (cortar la red en DevTools para ver el error), un pedido
  de prueba, el panel.
