# Estado del trabajo

> Última actualización: **23/10/2026**
> Este archivo viaja con el repositorio: en cualquier computadora, `git pull` y está acá.

---

## Dónde estamos

El sitio está **en producción y funcionando**: www.refrigeracionayp.com

| | |
|---|---:|
| Productos publicados | 3665 |
| **Sin categoría** | **~1150 (31%)** |
| Categorías creadas | 27 |

> Los productos publicados se midieron hoy contra producción. El número de los que no
> tienen categoría es del 20/10: para volver a contarlos hay que correr
> `asignarCategorias.mjs`, que lo informa antes de tocar nada.

Lo último que se terminó, todo desplegado y verificado contra producción:

1. la **segunda vuelta del buscador** (`03c55ef`, `1055f53`, `beb00a8`);
2. los **combos** (`3f198a3`);
3. una **auditoría** con 13 arreglos (`a249847`, `161cbe4`) — entre ellos, que el catálogo
   se podía bajar entero de un pedido y que en el celular no se podía ordenar;
4. **SEO** (`905a875`, `5a0f798`) — falta tu parte: Search Console y el Perfil de Empresa
   (ver abajo).

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

## Lo que se hizo el 23/10: combos

Productos armados con otros productos, **mezclados en el catálogo** como uno más.
Se arman desde **Tienda → Combos**: se busca cada producto por nombre o código, se pone
la cantidad, y el panel muestra el precio que va a salir mientras se arma.

| | |
|---|---|
| Precio | La **suma de las piezas al precio del día**, sin descuento por ser combo. No se congela: después de importar el Excel se actualiza solo. |
| Stock | Sin stock si **cualquier** pieza lo está, y dice cuál falta, para poder reponer esa pieza. |
| En el pedido | **Una sola línea** con su precio. |

**El WhatsApp llega con el detalle de cada pieza y su código**, porque en el sistema los
combos no existen y el presupuesto se carga pieza por pieza:

```
• 2× Combo instalación split 3500W (Código: COMBO-001) — $90.000 ARS
    ↳ 4× CAÑO 1/4 X 1MT (Código: 10234)
    ↳ 2× AISLANTE 1/4 (Código: 10567)
```

Las cantidades ya vienen **multiplicadas por la cantidad de combos**: son las que se
cargan para facturar. Lo mismo se ve en el carrito y en el detalle de la orden en el
panel, que queda como una foto del día del pedido: si después se le cambian las piezas
al combo, el presupuesto viejo sigue diciendo lo que se pidió.

Tres cosas que el sistema **no** deja hacer, a propósito: poner un combo adentro de otro,
armar uno con una sola pieza, y convertir en combo un producto del contable (sería una
forma silenciosa de reescribirle el precio).

> **Lo que había que cubrir primero**: la importación lista como "faltantes" todo lo que
> no viene en el Excel, y un combo no va a venir en ninguno. Sin la guarda aparecía en la
> pantalla de borrado con un tilde al lado, y no hay vuelta atrás.

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

### 2. Que los productos llamen más la atención

- Badge **"Más vendido"** con `soldCount`, que ya existe y ya es el orden por defecto.
- La cuota está en 10 px gris: subirla de jerarquía.
- Jerarquía en la grilla: los destacados a doble ancho.
- Nombre comercial opcional, que la importación no pise.

> **Decidido: el precio service NO se muestra a quien no está registrado.** Exhibirlo
> invita a que un particular falsee datos para que lo den de alta como técnico. Se
> promociona donde solo miran técnicos: registro, WhatsApp y circulares.

### 3. SEO — el código está, falta tu parte

**Lo que ya está hecho** (23/10):

- **Google recibe páginas de verdad.** Antes, de cada producto veía el nombre dos veces y
  nada más. Ahora ve marca, código, precio de lista, stock, migas de pan, productos
  relacionados y datos estructurados (`Product`). Lo arman `frontend/api/og-*.js`; las
  personas siguen recibiendo la SPA.
- **Categorías con URL propia**: `/catalogo/lavarropas`, `/catalogo/lavarropas/bombas`. Para
  Google, cada categoría lista **todos** sus productos como links (antes veía 24: no
  scrollea). Los links viejos `?cat=` redirigen.
- **La home** le pasa a Google la dirección, el teléfono y el horario del panel.
- **El sitemap** suma las categorías, y la fecha de cada producto ahora es real: la
  importación solo escribe lo que cambió.
- Producto borrado → **404**, para que salga del índice.

**Lo que tenés que hacer vos** (20 minutos, sin código):

1. **Google Search Console** (search.google.com/search-console): agregar
   `refrigeracionayp.com` como *dominio*, verificarlo con el registro TXT que te da en el
   DNS, y en *Sitemaps* enviar `https://www.refrigeracionayp.com/sitemap.xml`. Después, en
   *Inspección de URLs*, pedir la indexación de la home y de 4 o 5 categorías. Es la única
   forma de ver qué indexa Google y qué no.
2. **Perfil de Empresa de Google** (business.google.com) con la misma dirección, teléfono y
   horario que el panel, y el link al sitio. Para "repuestos de refrigeración cerca de mí"
   pesa más que todo lo anterior.
3. **Dominio propio para las fotos** (ver la tabla de abajo).

> **Categorizar ahora también es SEO**: un producto sin categoría no aparece en ninguna
> página de categoría ni tiene relacionados, así que Google solo lo encuentra por el
> sitemap. El más vendido de la tienda (`12100321`, bolsa recolectora) está así.

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
# las suites del backend (necesitan mongodb-memory-server)
cd Backend
npm install --no-save mongodb-memory-server
node src/scripts/__test-importacion.mjs    # 10 pruebas — importación de Excel
node src/scripts/__test-catalogo.mjs       # 11 pruebas — parámetros del catálogo
node src/scripts/__test-combos.mjs         # 29 pruebas — combos
node src/scripts/__test-busqueda.mjs       # 36 pruebas — buscador
node src/scripts/__test-marcas.mjs         # 13 pruebas — script de marcas
node src/scripts/__test-registro.mjs       # 39 pruebas — registro de técnicos
node src/scripts/__test-recuperacion.mjs   # 18 pruebas — contraseñas y backup
node src/scripts/__test-categorias.mjs     #  6 pruebas — menú de categorías

# el frontend
cd ../frontend
npm run lint    # 15 problemas es el valor normal, no sumar ninguno
npm run build
node scripts/__test-seo.mjs   # 27 pruebas — lo que ve Google (lee la API de producción)

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
| `Backend/src/utils/combos.js` | Precio, stock y detalle de los combos |
| `Backend/src/controllers/comboController.js` | Armar combos, con toda la validación |
| `frontend/src/pages/AdminCombos.jsx` | La pantalla para armarlos |
| `Backend/src/controllers/kitController.js` | Kit de instalación (el mismo criterio de precio que los combos) |
| `Backend/src/scripts/asignarCategorias.mjs` | Asignación masiva de categorías |
| `Backend/src/scripts/corregirMarcas.mjs` | Corrección masiva de marcas mal escritas |
| `frontend/src/pages/Catalogo.jsx` | El catálogo público y su buscador |
| `frontend/src/components/ProductCard.jsx` | La tarjeta de producto |
| `frontend/api/og-product.js`, `og-categoria.js` | Las páginas que reciben Google y WhatsApp (las personas reciben la SPA). La home no tiene: Vercel sirve `index.html` antes de mirar las reglas, así que ahí Google ejecuta la SPA |
| `frontend/src/utils/negocio.js` | Dirección, teléfono y horario del panel como datos para Google (los usa la home) |
| `frontend/src/utils/slug.js` | La única forma de armar una URL de categoría (la usan la SPA y Google) |
| `frontend/src/utils/seo.js` | Títulos y descripciones, los mismos para la SPA y para Google |
| `MANUAL-EMPLEADOS.md` | Manual de uso, al día |

---

## Para retomar en otra computadora

1. `git pull` en `catalogo-ayp-v2`
2. Abrir Claude Code en la carpeta del proyecto
3. Decirle: **"leé ESTADO.md y seguimos"**

La conversación anterior no viaja entre computadoras, pero este archivo y los comentarios
del código tienen el porqué de cada decisión.
