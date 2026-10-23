# Estado del trabajo

> Última actualización: **23/10/2026**
> Este archivo viaja con el repositorio: en cualquier computadora, `git pull` y está acá.

---

## Dónde estamos

El sitio está **en producción y funcionando**: www.refrigeracionayp.com

| | |
|---|---:|
| Productos en el catálogo | 3564 |
| Con categoría | 2405 |
| **Sin categoría** | **1159 (33%)** |
| Categorías creadas | 27 |

Lo último que se terminó fue la **segunda vuelta del buscador** (commits `03c55ef`,
`1055f53` y `beb00a8`), desplegada y verificada contra producción.

---

## Lo que se hizo el 23/10: el buscador entiende lo que escriben mal

Los técnicos escriben `lokring` por lockring y `tecunse` por tecumseh. Y había un
problema que había quedado del arreglo anterior: el reintento **inventaba palabras**.
Armaba variantes cambiando una letra, y `jabon` se volvía `labon`, que no existe pero
aparece dentro de "ESLABON de lujo": buscar jabón devolvía 10 productos sin ninguna
relación. Mostrar diez resultados equivocados es peor que no mostrar ninguno.

Ahora hay un **vocabulario** con las ~3000 palabras que de verdad están en los nombres y
las marcas, y la corrección va hacia ellas. Medido en producción:

| Búsqueda | Antes | Ahora | |
|---|---:|---:|---|
| `lokring` | 0 | 1 | dice "te mostramos resultados para **lockring**" |
| `jabon` | 10 basura | 0 | muestra lo más vendido |
| `válvula de seguridad` | 0 | 1 | el producto se llama "Valv.de seguridad" |
| `whirlpool` | 39 | 79 | las cuatro grafías de la marca |
| `tecunse` | 25 | 28 | |
| `tuvo` | 81 | 111 | |
| `ruleman` | 60 | 60 | sin cambios, como tiene que ser |

Tres cosas nuevas:

1. **Corrige hacia palabras que existen**, tolerando una letra de más, de menos, cambiada
   o dos invertidas (`drena` → `drean`). Si lo escrito no se parece a nada del catálogo,
   devuelve **cero** en vez de inventar.
2. **Acepta los nombres abreviados** del sistema contable: el cliente escribe "valvula" y
   el producto dice "Valv.". Solo se acepta el recorte si la forma corta **es** una palabra
   del catálogo y no se comió más de 4 letras — si no, buscar "capacitor" traería todo lo
   que diga "capa".
3. **Cuando no hay nada, muestra lo más vendido** de la categoría en la que estaba
   buscando, en vez de una pantalla vacía.

### Falta correr el script de marcas (3 minutos)

**Whirlpool está cargada de las dos formas: 39 productos bien escritos y 33 como
`WHIRPOOL`, sin la L.** El buscador ya las encuentra todas, pero conviene arreglar los
nombres igual, porque se ven mal en el catálogo. También hay `TECUMSHE`, `KOHINOR` y
`DANFOS`.

```powershell
cd Backend
$env:MONGO_URI = 'la-cadena-de-conexión-de-Atlas'

# ver qué haría y revisar el CSV que deja (no escribe nada)
node src/scripts/corregirMarcas.mjs

# aplicarlo
node src/scripts/corregirMarcas.mjs --confirmar

# si algo salió mal
node src/scripts/corregirMarcas.mjs --deshacer marcas-FECHA-HORA.json --confirmar
```

Es permanente: la importación de Excel toca precio, stock y categorías, pero **nunca el
nombre**.

---

## Lo próximo, en orden

### 1. Terminar de categorizar — lo que más impacto tiene

**1159 productos (33%) no están en ninguna categoría**: solo se encuentran con el buscador.

Hay un script que los asigna solo, por las palabras del nombre. **Simula por defecto** y
deja un CSV para revisar; recién con `--confirmar` escribe:

```powershell
cd Backend
$env:MONGO_URI = 'la-cadena-de-conexión-de-Atlas'

# ver qué haría (no escribe nada)
node src/scripts/asignarCategorias.mjs

# una categoría a la vez, recomendado para empezar
node src/scripts/asignarCategorias.mjs --categoria "Termostatos"
node src/scripts/asignarCategorias.mjs --categoria "Termostatos" --confirmar

# deshacer una corrida
node src/scripts/asignarCategorias.mjs --deshacer asignacion-FECHA-HORA.json --confirmar
```

**Falta crear una categoría** para que el script pueda usarla (Panel → Categorías):

| Nombre | Slug | Productos |
|---|---|---:|
| `Condensadores y evaporadores` | `cond-evap` | 30 |

Con subcategorías `Condensadores` (10) y `Evaporadores` (20).

> El script **no inventa categorías**: si no existe, avisa cuál falta y la saltea.
> Tampoco toca productos que ya tengan categoría.

### 2. Combos (decidido, sin empezar)

Productos armados con otros productos. Lo que ya está decidido:

- El combo entra al carrito como **una sola línea con precio propio**.
- El precio es la **suma de los componentes al precio actual, sin descuento**. El valor es
  la comodidad de no buscar pieza por pieza.
- El precio **no se guarda**: se calcula al vuelo, como hace hoy el kit de instalación
  (`Backend/src/controllers/kitController.js`), así nunca queda un combo con precios viejos
  después de una importación.
- Un combo está sin stock si cualquier componente lo está.

### 3. Que los productos llamen más la atención

- Badge **"Más vendido"** con `soldCount`, que ya existe y ya es el orden por defecto.
- La cuota está en 10 px gris: subirla de jerarquía.
- Jerarquía en la grilla: los destacados a doble ancho.
- Nombre comercial opcional, que la importación no pise.

> **Decidido: el precio service NO se muestra a quien no está registrado.** Exhibirlo
> invita a que un particular falsee datos para que lo den de alta como técnico. Se
> promociona donde solo miran técnicos: registro, WhatsApp y circulares.

### 4. SEO

1. Search Console + Google Business Profile (gratis, alto impacto, sin código).
2. Título y descripción propios en la home y `/catalogo` — hoy son genéricos incluso para
   Googlebot. Extender el patrón de `frontend/api/og-product.js`.
3. Páginas de categoría con URL propia (`/catalogo/gases-refrigerantes`).
4. Arreglar `buildUpdate()` (`productsController.js`): siempre escribe `inStock`, así que
   cada importación reescribe los 3564 productos y les renueva la fecha. Por eso el sitemap
   dice que todo cambió hoy.
5. Datos estructurados `Product` y `LocalBusiness`.

> **Dos correcciones a la auditoría SEO en PDF**, verificadas: las fichas **sí** mandan
> título, foto y `og:url` propios a WhatsApp y a Googlebot (la auditoría probó con
> navegador, que a propósito recibe la SPA); y el sitemap **ya usa** el `updatedAt` real —
> el problema está en el importador, no en el sitemap.

---

## Pendientes que no dependen del código

| Qué | Dónde | Por qué importa |
|---|---|---|
| **Cambiar la contraseña de Atlas** | MongoDB Atlas → Database Access | La cadena de conexión se pegó en un chat. Después actualizar `MONGO_URI` en Railway. |
| `ADMIN_EMAIL` | Railway → Variables | Sin esto no llega el aviso de técnicos nuevos ni funciona el Reply-To. |
| Confirmar `RESEND_API_KEY` | Railway → Variables | Si falta, **ningún correo se manda** y falla en silencio. |
| Borrar `GMAIL_ACCOUNT`, `GMAIL_PASSWORD` | Railway → Variables | No las usa nadie; quedaron de antes de Resend. |
| Borrar `ADMIN_NAME`, `ADMIN_PASSWORD` | Railway → Variables | Solo las usa el script del primer admin. Tu contraseña está ahí en texto plano. |
| **DMARC** | DNS del dominio | `_dmarc` TXT = `v=DMARC1; p=none; rua=mailto:...`. Sin él, más chance de spam. |
| Plan pago de Resend | resend.com → Billing | El gratuito corta en **100 correos por día**. Una circular a más de 100 técnicos no entra. |
| Dominio propio de R2 | Cloudflare | Hoy las fotos salen por `pub-...r2.dev`, el dominio de desarrollo. |
| Copia de seguridad | `node Backend/src/scripts/backup.js` | Atlas cobra por los backups automáticos. |

---

## Cómo probar que todo anda

```powershell
# las cuatro suites del backend (necesitan mongodb-memory-server)
cd Backend
npm install --no-save mongodb-memory-server
node src/scripts/__test-busqueda.mjs       # 36 pruebas — buscador
node src/scripts/__test-marcas.mjs         # 13 pruebas — script de marcas
node src/scripts/__test-registro.mjs       # 39 pruebas — registro de técnicos
node src/scripts/__test-recuperacion.mjs   # 18 pruebas — contraseñas y backup
node src/scripts/__test-categorias.mjs     #  6 pruebas — menú de categorías

# el frontend
cd ../frontend
npm run lint    # 15 problemas es el valor normal, no sumar ninguno
npm run build

# contra producción (pide el token de admin: F12 → Application → Local Storage → token)
node scripts/test-produccion.mjs TU_TOKEN
node scripts/verificar-matriculas.mjs TU_TOKEN
```

---

## Mapa rápido del código

| Dónde | Qué hay |
|---|---|
| `Backend/src/controllers/productsController.js` | Catálogo, búsqueda, importación de Excel |
| `Backend/src/utils/busqueda.js` | Armado del filtro de búsqueda (palabras, plurales, sinónimos, marcas) |
| `Backend/src/utils/vocabulario.js` | Las palabras que existen en el catálogo, para corregir hacia ellas |
| `Backend/src/controllers/serviceUserController.js` | Técnicos: registro, matrículas, exportaciones |
| `Backend/src/controllers/kitController.js` | Kit de instalación — **el patrón a reusar para combos** |
| `Backend/src/scripts/asignarCategorias.mjs` | Asignación masiva de categorías |
| `Backend/src/scripts/corregirMarcas.mjs` | Corrección masiva de marcas mal escritas |
| `frontend/src/pages/Catalogo.jsx` | El catálogo público y su buscador |
| `frontend/src/components/ProductCard.jsx` | La tarjeta de producto |
| `frontend/api/og-product.js` | Meta tags por producto para WhatsApp y Google |
| `MANUAL-EMPLEADOS.md` | Manual de uso, al día |

---

## Para retomar en otra computadora

1. `git pull` en `catalogo-ayp-v2`
2. Abrir Claude Code en la carpeta del proyecto
3. Decirle: **"leé ESTADO.md y seguimos"**

La conversación anterior no viaja entre computadoras, pero este archivo y los comentarios
del código tienen el porqué de cada decisión.
