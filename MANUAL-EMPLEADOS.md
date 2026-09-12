# Manual de uso — A&P Refrigeración
**Catálogo online y panel de administración**

---

## Índice

1. [Acceso a la plataforma](#1-acceso-a-la-plataforma)
2. [Navegación general](#2-navegación-general)
3. [Catálogo de productos](#3-catálogo-de-productos)
4. [Detalle de producto](#4-detalle-de-producto)
5. [Carrito y pedidos](#5-carrito-y-pedidos)
6. [Kit de instalación](#6-kit-de-instalación)
7. [Precio service (técnicos)](#7-precio-service-técnicos)
8. [Panel de administración](#8-panel-de-administración)
   - [Productos](#81-gestión-de-productos)
   - [Categorías](#82-gestión-de-categorías)
   - [Banners](#83-gestión-de-banners)
   - [Órdenes](#84-gestión-de-órdenes)
   - [Usuarios service](#85-gestión-de-usuarios-service)
   - [Kit de instalación (config)](#86-configuración-del-kit-de-instalación)
   - [Página de inicio (config)](#87-configuración-de-la-página-de-inicio)
   - [Configuración general](#88-configuración-general)
   - [Importar Excel (con vista previa)](#89-importar-excel-con-vista-previa)
   - [Destacados](#810-gestión-de-destacados)
   - [Métricas](#811-métricas)
   - [Administradores y niveles de acceso](#812-administradores-y-niveles-de-acceso)
9. [Modo oscuro](#9-modo-oscuro)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)
11. [Mantenimiento y copias de seguridad](#11-mantenimiento-y-copias-de-seguridad)

---

## 1. Acceso a la plataforma

### Sitio público (clientes)
La plataforma es accesible desde cualquier dispositivo con navegador (celular, computadora, tablet). No se requiere cuenta para ver el catálogo ni armar un pedido.

### Acceso al panel de administración
El panel de administración está disponible en:
```
/admin
```
Solo el personal autorizado con usuario y contraseña de administrador puede acceder. Si ingresás sin estar autenticado, el sistema te redirige al login de admin automáticamente.

**Para ingresar:**
1. Ir a la URL del sitio + `/admin`
2. Escribir el usuario y contraseña de administrador
3. Hacer clic en **"Ingresar"**

> **La sesión de administrador dura 2 días.** Después pide entrar de nuevo. Es a propósito: es la credencial que más cuidamos. Para salir antes, usá **"Cerrar sesión"** abajo del menú lateral.

> **Al cambiar la contraseña de administrador se cierran todas las sesiones abiertas**, en todos los dispositivos. Si alguna vez sospechás que alguien más entró, cambiarla lo saca al instante.

> ⚠️ **El administrador no tiene "olvidé mi contraseña" desde la pantalla de login.** Si hay otro administrador con acceso total, él puede cambiártela desde [Administradores](#812-administradores-y-niveles-de-acceso). Si no queda nadie, se cambia con un comando: ver [Si se pierde la contraseña de administrador](#si-se-pierde-la-contraseña-de-administrador). Aun así, anotala en un lugar seguro.

> **Hay dos niveles de administrador: total y limitado.** Según cuál tengas, vas a ver más o menos secciones en el menú. Está explicado en [8.12 Administradores y niveles de acceso](#812-administradores-y-niveles-de-acceso).

---

## 2. Navegación general

### Menú principal
El menú superior está siempre visible y contiene:

| Sección | Descripción |
|---|---|
| **Inicio** | Página de bienvenida con productos destacados |
| **Productos** | Listado completo con filtros |
| **Kit instalación** | Calculadora de kit de instalación |
| **Contacto** | Dirección, teléfono, WhatsApp y mapa |
| **Admin** | Visible **solo para administradores reales** |

### En celular
- Arriba: el menú de hamburguesa (≡) y un **botón de WhatsApp** para escribir directo.
- Abajo: una barra fija con **Inicio · Productos · Kit · Pedido**. El carrito vive ahí, con el número de artículos.

> El botón verde flotante de WhatsApp **solo aparece en computadora**. En el celular tapaba los botones de cantidad y los textos, así que se movió arriba.

### Botón de carrito
En computadora, el ícono de carrito (🛒) arriba a la derecha muestra la cantidad de artículos. En celular es el botón **"Pedido"** de la barra de abajo.

---

## 3. Catálogo de productos

### Cómo buscar un producto
En la barra de búsqueda superior se puede escribir el **nombre** o el **código** del producto. La búsqueda es automática (no hace falta presionar Enter) y filtra los resultados a medida que se escribe.

> La búsqueda mínima es de 2 caracteres.

### Filtros disponibles

**Categoría y subcategoría** (panel izquierdo en escritorio / botón "Filtros" en celular):
- Seleccionar una categoría principal para ver solo esos productos
- Si la categoría tiene subcategorías, aparecen debajo para filtrar más fino
- Hacer clic en "Todos" para limpiar el filtro

**Marca:**
- El panel de filtros también lista todas las marcas disponibles
- Se pueden seleccionar múltiples marcas al mismo tiempo

**Ordenamiento** (selector arriba a la derecha):
- Más vendidos
- A-Z
- Más nuevos
- Menor precio
- Mayor precio

### Cómo limpiar todos los filtros
En el panel de filtros hay un botón **"Limpiar filtros"** que restablece todo.

### Carga infinita
El catálogo carga 24 productos por vez. Al llegar al final de la página se cargan más automáticamente (no hay botón de "siguiente página").

### Tarjeta de producto
Cada producto muestra:
- Imagen (si el producto no tiene foto, se muestra un recuadro azul con la marca o la inicial de la categoría)
- Marca (si tiene)
- Nombre
- Precio en ARS
- Cuotas (precio en 6 cuotas con interés)
- Indicador de **Sin stock** (si aplica)
- Botón **"Agregar"**

> **Cómo funciona el botón:** la tarjeta muestra solo **"Agregar"**. Al tocarlo, el botón se convierte en un contador con **− 1 +** que refleja lo que hay en el pedido. Bajar a 0 lo saca del carrito. Antes había un selector de cantidad separado que no tenía relación con el pedido real.

---

## 4. Detalle de producto

Al hacer clic en un producto del catálogo se abre la página de detalle con toda la información disponible:

- Imagen ampliada
- Marca
- Nombre completo
- Código de producto
- Estado de stock
- Descripción
- Precio en ARS y cuotas
- Precio con descuento service (si el usuario tiene precio service activo)

### Compartir un producto
Debajo del botón "Agregar al pedido" hay dos opciones para compartir:

- **"Compartir" (verde):** Abre WhatsApp con el nombre, código, precio y link del producto listos para enviar.
- **"Copiar link":** Copia la URL del producto al portapapeles. Si el navegador lo soporta, puede abrir el menú de compartir nativo del celular.

### Productos relacionados
Al final de la página se muestra una sección con productos de la misma categoría. En celular se puede deslizar horizontalmente.

---

## 5. Carrito y pedidos

### Agregar productos
Desde el catálogo o el detalle de producto, seleccionar la cantidad con los botones −/+ y luego tocar **"Agregar"** o **"Agregar al pedido"**. Aparece una notificación de confirmación.

### Ver el carrito
Tocar el ícono de carrito en el menú superior. Se muestran todos los productos agregados con:
- Imagen, nombre y precio unitario
- Cantidad (con botones para cambiarla)
- Subtotal por producto
- Botón para eliminar ese producto del pedido

### Modificar cantidades en el carrito
Usar los botones − y + dentro del carrito para ajustar la cantidad de cada producto.

### El aviso "Actualizamos tu pedido"
El carrito queda guardado en el navegador del cliente, incluso si cierra la página y vuelve días después. Como los precios se actualizan con cada importación de Excel, **al abrir el carrito el sistema verifica precios y stock**:

- Si algo **cambió de precio**, se actualiza y aparece un aviso amarillo con el detalle.
- Si algo **quedó sin stock** o se despublicó, se saca del pedido y se explica por qué.

Esto existe para que el cliente se entere **antes** de confirmar. Si algún cliente pregunta por qué le cambió el total, es esto: tenía un precio viejo guardado.

### Finalizar el pedido
1. En la sección inferior del carrito, completar:
   - **Nombre completo** (obligatorio)
   - **Teléfono** (obligatorio, ej: 1122334455)
2. Revisar el **Total estimado**
3. Tocar **"Finalizar pedido por WhatsApp"**
4. Se abre WhatsApp con un mensaje pre-armado que incluye todos los productos, cantidades y el total
5. Enviar el mensaje al número de la empresa

> El precio es una estimación. El precio final lo confirma el equipo de A&P.

### Vaciar el carrito
El botón **"Vaciar"** (en rojo) elimina todos los productos del carrito de una sola vez. Pide confirmación antes de hacerlo.

---

## 6. Kit de instalación

La calculadora de kit permite armar un presupuesto estimado para una instalación completa.

### Cómo usarla
1. Ir a **Kit** en el menú
2. Para cada componente (caño de cobre, cable, aislante, ménsulas, etc.), ajustar la cantidad con los botones −/+ o escribir el número directamente
3. Si el componente tiene variantes (ej: distintas medidas de caño), seleccionarlas en el desplegable
4. El **Resumen** a la derecha se actualiza automáticamente con el precio de cada componente y el total

### Reglas especiales
- **Patas de ménsula** y **Patas de piso** son mutuamente excluyentes: si se pone cantidad en una, la otra se pone en 0 automáticamente.

### Precio service en el kit
Si un técnico **inició sesión y su cuenta está aprobada**, el resumen del kit muestra los precios y el total **con el 10% de descuento service** ya aplicado, con una etiqueta **"Precio service"**. El mensaje de WhatsApp también sale con esos precios con descuento. Para un visitante no logueado, se ven los precios normales.

> El descuento lo calcula el servidor, no el navegador. Antes lo hacía el navegador, así que el mensaje que llegaba al local podía decir "con descuento service" sin que nadie lo hubiera verificado.

### Enviar por WhatsApp
Si hay un número de WhatsApp configurado, aparece el botón verde **"Enviar por WhatsApp"**. Al tocarlo se abre WhatsApp con el detalle completo del kit y el total para cotizar.

---

## 7. Precio service (técnicos)

Los técnicos matriculados pueden registrarse para obtener un **10% de descuento** en todos los productos.

### Registro
1. Ir a **"Soy service"** en el menú (o al ícono de usuario)
2. Completar el formulario de registro:
   - Nombre y apellido
   - Email
   - Contraseña (mínimo **8** caracteres)
   - **CUIT** (obligatorio)
   - Empresa / Taller (opcional)
   - Provincia
   - Teléfono
   - **Foto de la matrícula o certificado** (opcional). Si el técnico no tiene matrícula, puede tocar **"No tengo matrícula"**, que abre un WhatsApp a la administración para resolverlo.
3. Enviar la solicitud
4. La cuenta queda **pendiente de aprobación** hasta que un administrador la apruebe
5. Cuando se aprueba, el administrador le asigna un **número de cliente** y el técnico recibe un **email** avisándole (lo mismo si se rechaza, con el motivo)

### Una vez aprobado
Al iniciar sesión, el técnico ve:
- Badge **"Precio service"** en el menú
- Todos los precios con el descuento ya aplicado
- El precio público tachado debajo del precio service en el detalle del producto

### Iniciar sesión
Ir a "Soy service" → ingresar email y contraseña → tocar **"Ingresar"**.

> **Una cuenta pendiente de aprobación no puede entrar.** Si intenta, el sistema le avisa que todavía está esperando confirmación. Antes podía entrar igual aunque no estuviera aprobada; eso se corrigió.

### Si olvidó la contraseña
En la pantalla de inicio de sesión hay un enlace **"¿Olvidaste tu contraseña?"**. Pone su email y le llega un correo con un enlace para crear una nueva. El enlace vence en 1 hora y sirve una sola vez. Si no le llega, que revise spam.

---

## 8. Panel de administración

Acceder desde `/admin` con las credenciales de administrador.

---

### 8.1 Gestión de productos

Es la sección principal del admin. Permite ver, crear, editar y eliminar todos los productos del catálogo.

#### Buscar y filtrar
- **Buscador:** Por nombre o código (debounce de 400ms)
- **Categoría / Subcategoría:** Desplegables para filtrar
- **Ordenamiento:** Más nuevos, A-Z, Z-A, precio ascendente/descendente, activos primero

#### Crear un producto
1. Clic en **"+ Nuevo producto"**
2. Completar el formulario:
   - **Nombre** (obligatorio)
   - **Código** (obligatorio, debe ser único)
   - **Marca** (opcional)
   - **Descripción** (obligatorio)
   - **Precio (ARS):** el precio en pesos, sin más vueltas
   - **Categorías:** Seleccionar una o más (aparecen como botones)
   - **Subcategorías:** Se habilitan según las categorías seleccionadas
   - **Imagen:** Opcional, se puede subir desde el dispositivo
3. Clic en **"Guardar"**

#### Editar un producto
Clic en **"Editar"** en la tarjeta del producto. Se abre el mismo formulario con los datos actuales. Modificar lo necesario y guardar.

#### Eliminar un producto
Clic en **"Eliminar"** (rojo). El sistema pide confirmación antes de proceder.

> ⚠️ La eliminación es permanente. Si solo se quiere ocultar del catálogo, usar **"Desactivar"** en su lugar.

> El botón **"Eliminar"** solo aparece para los administradores con **acceso total** (ver [8.12](#812-administradores-y-niveles-de-acceso)). Lo mismo con **"Importar Excel"**.

#### Activar / Desactivar un producto
- **"Desactivar":** El producto deja de aparecer en el catálogo público (sigue existiendo en el admin)
- **"Activar":** Lo vuelve a mostrar en el catálogo

#### Marcar como destacado
El botón **"★ Destacar"** / **"Destacado"** hace que el producto aparezca en la sección de productos destacados de la página de inicio.

#### Gestionar stock
El botón **"Sin stock"** / **"Con stock"** cambia el estado de disponibilidad. Los productos sin stock se muestran igual en el catálogo pero con un badge rojo y el botón de agregar deshabilitado.

#### Importar productos desde Excel
Clic en **"Importar Excel"** abre la pantalla **Importar Excel** (también está en el menú del admin), que ahora tiene **vista previa y confirmación** antes de aplicar los cambios. Ver el detalle en la sección [8.9 Importar Excel (con vista previa)](#89-importar-excel-con-vista-previa).

#### Exportar a Excel
Clic en **"Exportar Excel"** para descargar todos los productos en un archivo de planilla de cálculo.

---

### 8.2 Gestión de categorías

Permite crear la estructura de categorías y subcategorías que se usan para organizar los productos.

#### Ver la estructura actual
La pantalla muestra un árbol jerárquico con todas las categorías. Las categorías padre aparecen en azul, y sus subcategorías aparecen indentadas debajo.

#### Crear una categoría principal
1. En el formulario superior, completar:
   - **Nombre:** Nombre visible (ej: "Compresores")
   - **Slug:** Identificador URL sin espacios ni tildes (ej: "compresores")
   - **Categoría padre:** Dejar en "Sin categoría padre"
2. Clic en **"Crear categoría"**

#### Crear una subcategoría
Igual que una categoría principal, pero en **Categoría padre** seleccionar la categoría a la que pertenece.

#### Eliminar una categoría
Clic en el ícono de basura (🗑) junto a la categoría. 

> ⚠️ Si se elimina una categoría que tiene productos asignados, esos productos pierden esa categoría. Verificar antes de eliminar.

---

### 8.3 Gestión de banners

Los banners son las imágenes del carrusel que aparecen en la página de inicio.

#### Ver los banners
La sección muestra todos los banners con su imagen, título, estado (activo/inactivo) y número de orden.

#### Los tres tipos de banner

| Tipo | Dónde se ve | Cómo se arma |
|---|---|---|
| **Home (hero)** | Carrusel al lado del título, en la página de inicio (solo en computadora) | Es una imagen: todo el arte va adentro del archivo |
| **Promo (home)** | Banda ancha debajo del hero, **también en celular** | La arma el sistema: vos ponés el texto y **solo la foto del producto** |
| **Tienda (sin uso)** | Ya no se muestra en ningún lado | Queda para no perder los banners viejos |

#### Crear un banner
1. Seleccionar el tipo arriba a la derecha
2. Clic en **"+ Nuevo banner"**
3. Completar:
   - **Etiqueta** (solo para tipo Promo): el texto chico de arriba, ej. `NUEVO INGRESO`
   - **Título** (aparece sobre la imagen)
   - **Subtítulo** (texto secundario, opcional)
   - **Link:** URL a donde lleva al hacer clic (ej: `/catalogo?cat=Compresores`). Opcional.
   - **Tipo:** Home, Promo o Tienda
   - **Orden:** Número que determina la posición en el carrusel (1 = primero)
   - **Estado:** Activo o Inactivo
   - **Imagen:** Subir desde el dispositivo
     > **Home:** cuadrada, mínimo 900×900px.
     > **Promo:** la **foto del producto recortada**, con fondo transparente o blanco liso, mínimo 800×800px. **No subas un flyer con texto**: el fondo, los colores y el botón los pone el sistema, así que un flyer se vería flotando arriba del diseño.
4. Clic en **"Guardar"**

> **El banner Promo es el que se ve en celular.** El carrusel Home está oculto en pantallas chicas, y la mayoría de los clientes entran desde el teléfono. Si tenés una sola cosa para destacar, poné un Promo.

#### Editar un banner
Clic en **"Editar"** sobre el banner a modificar.

#### Desactivar / Activar un banner
El botón **"Desactivar"** / **"Activar"** controla si el banner aparece en el carrusel público sin necesidad de eliminarlo.

#### Reordenar banners
Si hay varios banners, los números de orden (#1, #2, etc.) determinan la secuencia del carrusel. Para cambiar el orden, editar el campo **"Orden"** de cada banner y luego clic en **"Guardar orden"**.

#### Eliminar un banner
Clic en **"Eliminar"**. Pide confirmación antes de proceder.

---

### 8.4 Gestión de órdenes

Aquí se ven todos los pedidos que los clientes enviaron desde el carrito.

#### Lista de órdenes
Cada órdenes muestra:
- Nombre y teléfono del cliente
- Fecha de creación
- Total estimado en ARS
- Estado: **Pendiente** (amarillo) o **Contestada** (verde)

Las órdenes se cargan de a 50. Si hay más, aparece **"Ver más órdenes"** al final de la lista.

#### Cambiar el estado de una orden
Clic en **"Marcar como contestada"** / **"Marcar como pendiente"** para alternar el estado. Esto sirve para llevar control interno de cuáles pedidos ya fueron atendidos.

> Las órdenes llegan principalmente por WhatsApp. Este registro es un complemento para tener historial.

> **Marcá las órdenes como contestadas.** No es solo prolijidad: la sección **Métricas** usa ese estado para avisarte cuántos pedidos quedaron sin responder y desde hace cuánto está el más viejo. Si nunca se marcan, esa alerta no sirve para nada.

---

### 8.5 Gestión de usuarios service

Aquí se aprueban o rechazan las solicitudes de registro de técnicos que quieren acceder al precio service.

#### Filtrar por estado
Los botones en la parte superior permiten filtrar por:
- **Pendiente:** Solicitudes que esperan revisión
- **Aprobado:** Técnicos ya habilitados
- **Rechazado:** Solicitudes denegadas
- **Todos:** Ver todos sin filtro

#### Información de cada solicitud
Cada tarjeta muestra:
- Nombre completo y estado
- Email
- **CUIT**
- Empresa / Taller
- Provincia
- Teléfono
- Fecha de registro
- **"Ver foto de matrícula"** (si el técnico subió una imagen; se abre en grande)
  > La imagen es un documento personal: se descarga con tu sesión de administrador y **ya no tiene una dirección pública**. Antes cualquiera con el enlace podía verla, para siempre.
- **Número de cliente** (si ya está aprobado)

#### Aprobar un usuario
1. Escribir el **número de cliente** que se le asigna al técnico (es obligatorio para aprobar)
2. Clic en **"Aprobar"** (verde)
3. El técnico recibe un **email** con su número de cliente y ya puede acceder al precio service en su próximo inicio de sesión

#### Rechazar un usuario
1. Clic en **"Rechazar"** (rojo)
2. Escribir el **motivo del rechazo** (es obligatorio)
3. Clic en **"Confirmar rechazo"**

El motivo queda visible en la tarjeta del usuario (en rojo) y el técnico recibe un **email** avisándole del rechazo con el motivo.

#### Corregir los datos de un técnico
Los técnicos cambian de teléfono, o cargan mal el CUIT al registrarse. Cada tarjeta tiene un botón **"Editar datos"** (disponible en cualquier estado, no solo en los pendientes).

Se pueden corregir: nombre, email, CUIT, teléfono, empresa, provincia y número de cliente.

- El **CUIT** tiene que tener 11 dígitos. Podés escribirlo con guiones: el sistema los saca solo.
- Si ponés un **email que ya usa otra cuenta**, avisa y no guarda.
- Si le **cambiás el email**, se le cierra la sesión y tiene que volver a entrar con el nuevo.

#### Si un técnico perdió su contraseña
No hace falta que hagas nada: en la pantalla de inicio de sesión hay un enlace **"¿Olvidaste tu contraseña?"**. El técnico pone su email y le llega un correo con un enlace para crear una nueva.

- El enlace **vence en 1 hora** y sirve **una sola vez**.
- Al cambiar la contraseña se le cierran las sesiones abiertas. Es a propósito: si alguien le hubiera robado el acceso, esto lo saca.
- Si dice que no le llega, que revise **spam**. Si igual no aparece, avisá: puede ser un problema del servicio de correo.

> Vos **no podés ver ni cambiar** la contraseña de un técnico, y está bien que sea así. El único camino es que él pida el enlace.

---

### 8.6 Configuración del kit de instalación

Permite definir qué componentes forman parte del kit y sus precios asociados (vinculados a productos del catálogo por código).

#### Estructura de un ítem
Cada ítem del kit tiene:
- **Key:** Identificador interno único (ej: `copper_big`)
- **Nombre:** Etiqueta visible para el usuario (ej: "Caño de cobre grueso")
- **Unidad:** `m` (metros) o `u` (unidades)
- **Paso:** Incremento mínimo (ej: 0.5 para caños en metros)
- **Default:** Cantidad inicial sugerida
- **Código de producto:** Código del producto del catálogo que se usa para tomar el precio
- **Variantes:** Si el ítem tiene variantes (distintas medidas), cada variante tiene su propio código de producto

#### Agregar un ítem nuevo
Clic en **"+ Agregar ítem"** al final de la tabla.

#### Agregar variantes a un ítem
Clic en **"+ Agregar variante"** dentro del ítem. Completar el valor de la variante (ej: "3/8") y el código de producto correspondiente.

> Si un ítem tiene variantes, el campo de código de producto único se deshabilita.

#### Guardar los cambios
Clic en **"Guardar cambios"**. El sistema valida que todos los ítems tengan key, nombre, unidad y al menos un código de producto antes de guardar.

#### Eliminar un ítem
Clic en **"Eliminar"** a la izquierda del ítem.

---

### 8.7 Configuración de la página de inicio

Permite editar todo el contenido visible de la landing page sin necesidad de tocar código.

#### Sección: Hero principal
El hero es el banner grande de bienvenida con el gradiente azul.

| Campo | Descripción |
|---|---|
| Badge | Texto pequeño arriba del título (ej: "Stock permanente · Buenos Aires") |
| Título (línea 1) | Primera línea del titular (ej: "Repuestos para") |
| Título destacado (línea 2) | Segunda línea en celeste (ej: "Refrigeración") |
| Subtítulo | Texto descriptivo debajo del título |
| Botón principal | Texto del botón blanco (ej: "Ver Catálogo →") |
| Botón secundario | Texto del botón de borde blanco (ej: "Precio Service") |

**Foto de fondo:**
- Clic en **"Agregar foto"** o **"Cambiar foto"** sobre el mini preview
- Subir una imagen horizontal (mínimo 1200px de ancho recomendado)
- La imagen se muestra detrás del gradiente azul
- Clic en la X roja para quitar la imagen y volver al gradiente solo

#### Sección: Estadísticas
Dos tarjetas de números que aparecen al lado del hero (si no hay banners).

| Campo | Descripción |
|---|---|
| Etiqueta superior | Texto en mayúsculas (ej: "PRODUCTOS") |
| Número grande | Valor destacado (ej: "2k+") |
| Descripción | Texto explicativo (ej: "En catálogo") |

#### Sección: Tarjetas de información
Las 4 tarjetas con íconos que muestran servicios clave (envíos, WhatsApp, precio service, horario). Se puede editar el título y descripción de cada una.

> En la página de inicio se muestran solo dos de las cuatro (Envíos y Horario), para que entren completas en el celular. Las otras dos quedan guardadas.

#### Sección: Categorías destacadas del inicio
Define **qué categorías aparecen en la página de inicio y en qué orden**.

- A la **derecha** están las disponibles: son las categorías reales de tus productos, no una lista fija. Clic en una para agregarla.
- A la **izquierda** las elegidas, numeradas en el orden en que se van a ver. Con **↑ ↓** se mueven y con **✕** se sacan.

> Si no elegís ninguna, se muestran **las primeras 7 por orden alfabético**, que es como funcionaba antes. Por eso aparecían siempre las mismas.

> Si más adelante **renombrás una categoría** (desde el Excel o desde Categorías), la que estaba elegida deja de coincidir y simplemente no se muestra. No se rompe nada, pero hay que volver a elegirla acá.

#### Sección: ¿Quiénes somos?
Texto libre para la sección "Acerca de" de la empresa.

#### Sección: Información de contacto

| Campo | Descripción |
|---|---|
| Dirección | Dirección del local (texto libre) |
| Teléfono (display) | Número formateado para mostrar (ej: 11-6881-5837) |
| WhatsApp | Número limpio sin +, sin espacios (ej: 5491168815837) — usado para el botón flotante |
| Horario | Texto de horario de atención |

> El número de WhatsApp del campo "WhatsApp" es el que aparece en el botón verde flotante en toda la página.

#### Sección: Kit de instalación
Texto de la sección que invita al usuario a usar el calculador del kit.

#### Guardar
Clic en **"Guardar cambios"** (arriba a la derecha o abajo del formulario). Aparece un mensaje verde de confirmación o rojo si hubo error.

---

### 8.8 Configuración general

#### WhatsApp de administración
El número al que se avisa cuando un técnico se registra sin imagen de matrícula, para poder validarlo a mano.

1. Escribir el número (solo dígitos, con código de país: `5491112345678`)
2. Clic en **"Guardar"**

> **Sobre el dólar:** antes había acá un campo de cotización, porque algunos productos tenían el precio en dólares y se recalculaban solos. Hoy **todos los precios salen del Excel en pesos**, así que ese campo se sacó junto con los campos de USD del formulario de producto. Si alguna vez hiciera falta volver a trabajar con dólares, la función sigue existiendo por debajo y se puede reactivar.

---

### 8.9 Importar Excel (con vista previa)

Es la forma recomendada de cargar/actualizar muchos productos de una vez. **Ya no aplica los cambios de un solo click**: primero muestra una **vista previa** para que revises y confirmes.

#### Paso 1 — Subir el archivo
1. Entrar a **Importar Excel** (en el menú del admin, o desde el botón "Importar Excel" en Productos)
2. Elegir el archivo `.xlsx`, `.xls` o `.csv`
3. El sistema **lo analiza sin cambiar nada todavía** y muestra la vista previa

#### Paso 2 — Revisar la vista previa
Aparecen tres secciones con un resumen arriba (*nuevos · a actualizar · faltantes*):

- **Productos nuevos:** los que están en el Excel y todavía no están en la web. Vienen **todos tildados**; destildá los que **no** quieras cargar.
- **Actualizaciones:** un contador de productos existentes que van a actualizar precio/stock. Se aplican solas.
  > Importante: **el nombre editado a mano no se toca**, y un **precio fijado a mano** no se pisa por la cotización del dólar.
- **No están en el Excel:** productos activos en la web que **no aparecen** en el archivo. Por cada uno elegís **Mantener** (por defecto), **Desactivar** o **Eliminar**. Hay botones para marcar todos de una.

#### Paso 3 — Confirmar
1. Clic en **"Confirmar importación"**
2. Aparece un resumen ("se crean X, actualizan Y, eliminan D, desactivan E") — confirmar
3. Al terminar se muestra el resultado (creados / actualizados / eliminados / desactivados / omitidos)

> **Seguridad:** por defecto **no se borra nada**. Solo se eliminan o desactivan los productos que marcaste explícitamente. **"Desactivar" es reversible** (el producto se oculta pero se puede reactivar); "Eliminar" es permanente. Si el Excel es una lista parcial, dejá los faltantes en "Mantener".

> **Freno al borrado masivo:** si el archivo dejaría fuera **más del 20% del catálogo**, el sistema **no aplica el borrado** y pide una confirmación extra. Casi siempre eso significa que el Excel está incompleto o se cortó al exportarlo. Ante la duda, cancelá y volvé a exportar el archivo: **eliminar no se puede deshacer y no hay copia de seguridad**.

> ⚠️ **Importá solo archivos del sistema contable.** Un Excel de origen desconocido (uno que llegó por mail de alguien que no conocés, o descargado de internet) puede aprovechar una falla conocida de la librería que lee los archivos y afectar el funcionamiento del servidor hasta que se reinicie. La falla no tiene arreglo disponible todavía. Si tenés dudas sobre un archivo, no lo subas.

---

### 8.10 Gestión de destacados

Los **destacados** son los productos que aparecen en la sección "Más vendidos" de la página de inicio (una card grande arriba y un carrusel debajo). Se administran en **Admin → Destacados**.

#### Ver y ordenar
- La pantalla lista todos los destacados **en orden**. El **primero** es la **card grande** del inicio; el resto va en el **carrusel**.
- Usar las flechas **↑ / ↓** de cada producto para cambiar el orden y luego **"Guardar orden"**.

#### Agregar un destacado
En **"Agregar destacado"**, buscar el producto por nombre o código y tocar **"Destacar"**. Se agrega al final de la lista.

#### Quitar un destacado
Tocar la **✕** del producto en la lista. Deja de ser destacado (el producto sigue existiendo en el catálogo).

---

### 8.11 Métricas

En **Gestión → Métricas**. Son datos propios del sitio: no hace falta entrar a Google Analytics ni a ningún otro lado.

Arriba se elige el período: **7, 30 o 90 días**.

#### Visitas
- **Visitas:** personas distintas que entraron.
- **Páginas vistas** y cuántas mira cada una en promedio.
- **Visitas que compran:** qué porcentaje termina en pedido. Es el número que dice si el sitio está funcionando.
- **Visitas por día**, **páginas más vistas** y **de dónde llegan** (Google, WhatsApp, Instagram, o "directo" = escribieron la dirección o entraron desde un favorito).

#### Pedidos
Cantidad, facturación, ticket promedio, cuántos quedaron **sin responder** y hace cuánto está el más viejo.

#### Productos
- **Más pedidos** en el período.
- **Se miran y no se piden:** productos con muchas visitas y pocos pedidos. Suele ser el precio, la foto o que está sin stock. Es el lugar donde más rápido se gana plata mirando.

#### Búsquedas
- **Sin resultados:** lo que la gente busca y **no encuentra**. Puede ser stock que falta o un producto cargado con otro nombre. Es el dato más valioso de toda la pantalla.
- **Más frecuentes:** qué escriben en el buscador.

#### Técnicos
Aprobados, pendientes, cuántos llevan **más de 3 días** esperando, y registros nuevos del período.

> **Los números arrancan de cero el día que se activó esto.** Las visitas y búsquedas anteriores no están: se van llenando con el uso.

> Las visitas **no incluyen** tu propio panel de administración ni los robots de Google.

---

### 8.12 Administradores y niveles de acceso

En **Gestión → Administradores**. Desde acá se dan de alta las personas que entran al panel y se decide hasta dónde llega cada una.

#### Los dos niveles

| | **Acceso limitado** | **Acceso total** |
|---|---|---|
| Productos: crear, editar, activar, stock, destacar | ✅ | ✅ |
| **Borrar** productos | ❌ | ✅ |
| **Importar Excel** | ❌ | ✅ |
| Banners / slider | ✅ | ✅ |
| Categorías: crear | ✅ | ✅ |
| Categorías: **borrar** | ❌ | ✅ |
| Órdenes y técnicos (services) | ✅ | ✅ |
| Métricas | ✅ | ✅ |
| Página de inicio, Configuración, Kit de instalación | ❌ | ✅ |
| Crear y eliminar administradores | ❌ | ✅ |
| Cambiar **su propia** contraseña | ✅ | ✅ |

La idea es simple: **el acceso limitado hace el día a día y no puede romper nada grande**. Lo que borra, reemplaza precios de todo el catálogo o cambia lo que ve el cliente en la página de inicio queda para el acceso total.

Quien tiene acceso limitado **no ve** en el menú las secciones que no puede usar, y tampoco le aparecen los botones de "Eliminar" ni "Importar Excel".

#### Crear un administrador
1. **Gestión → Administradores**
2. En **"Nuevo administrador"**: usuario, contraseña (mínimo **12 caracteres**) y nivel
3. Clic en **"Crear administrador"**

> ⚠️ **Anotá la contraseña antes de crear la cuenta.** Después no se puede ver, solo reemplazar.

> Usuarios sugeridos: algo que identifique a la persona o al puesto (`deposito`, `mostrador`, `juan`). No compartan una misma cuenta entre varias personas: si pasa algo, no hay forma de saber quién hizo qué.

#### Cambiarle el nivel a alguien
En la lista, elegir el nivel en el desplegable de esa fila. El cambio es inmediato.

#### Cambiarle la contraseña a alguien
Botón de la **llave** (🔑) en su fila. Pide la contraseña nueva. **Se le cierran todas las sesiones abiertas**, así que va a tener que entrar de nuevo con la nueva.

Es lo que se usa cuando alguien se olvida la suya.

#### Eliminar un administrador
Botón del **tacho** (🗑) en su fila. La persona deja de entrar al panel de inmediato.

> No se puede eliminar la **propia** cuenta, ni dejar el sistema sin **ningún administrador con acceso total**: el sistema lo impide. Es a propósito, para que no quede nadie que pueda importar el Excel.

#### Cambiar mi propia contraseña
Arriba de todo, en **"Cambiar mi contraseña"**. Está disponible para los dos niveles (el acceso limitado ve esta pantalla como **"Mi cuenta"**, solo con este recuadro).

Pide la contraseña actual a propósito: si alguien agarra una sesión abierta, sin la actual no puede apropiarse de la cuenta.

Al cambiarla, **el sistema te cierra la sesión** y tenés que entrar de nuevo con la nueva.

#### Si a alguien le aparece "Esta sección no está disponible para tu cuenta"
Su usuario tiene acceso limitado. Quien tenga acceso total puede subirlo de nivel desde esta misma pantalla.

---

## 9. Modo oscuro

En el menú superior hay un botón con ícono de sol/luna (🌙/☀️) para alternar entre modo claro y modo oscuro. La preferencia se guarda en el navegador.

---

## 10. Preguntas frecuentes

**¿Por qué no aparece un producto en el catálogo?**
Verificar en el panel admin que el producto esté **activo** (no desactivado). También verificar que tenga al menos una categoría asignada.

**¿Por qué no se ve el botón flotante de WhatsApp?**
El botón solo aparece si hay un número cargado en la configuración. Ir a **Admin → Página de inicio → Información de contacto → WhatsApp** y verificar que haya un número guardado.

**¿Cómo agrego una nueva categoría y la asigno a un producto?**
Primero crear la categoría en **Admin → Categorías**. Luego editar el producto en **Admin → Productos** y seleccionar la nueva categoría.

**¿Un técnico me dice que no ve el precio service aunque fue aprobado, qué hago?**
Pedirle que cierre sesión y vuelva a iniciar. El precio service se activa en el próximo login después de ser aprobado.

**¿Se puede cambiar el porcentaje de descuento service?**
Actualmente el descuento service está fijado en 10%. Para cambiarlo se requiere modificación en el código.

**¿Los pedidos del carrito llegan solos o hay que hacer algo?**
El cliente completa su pedido en el carrito y al confirmar se le abre WhatsApp con el detalle. El pedido queda registrado en **Admin → Órdenes** como "Pendiente". El equipo debe atender la conversación de WhatsApp y luego marcar la orden como "Contestada" en el admin para llevar el control.

**¿Y la cotización del dólar?**
Ya no se usa: todos los precios salen del Excel en pesos. El campo se sacó del panel, junto con los campos de USD del formulario de producto. Ver [8.8](#88-configuración-general).

**Un cliente dice que le cambió el total del pedido, ¿por qué?**
Tenía el carrito guardado con precios viejos. Al abrirlo de nuevo, el sistema actualiza precios y stock y le muestra un aviso con lo que cambió. Ver [El aviso "Actualizamos tu pedido"](#el-aviso-actualizamos-tu-pedido).

**¿Cuánta gente visita la página?**
En **Gestión → Métricas**. Ahí también se ve de dónde llegan y qué buscan. Ver [8.11](#811-métricas).

**¿Puedo tener un banner inactivo preparado para activar después?**
Sí. Crear el banner con estado **"Inactivo"** y activarlo cuando sea necesario sin necesidad de crearlo de nuevo.

**Si importo un Excel, ¿me borra los productos que no están en el archivo?**
No, salvo que vos lo pidas. La importación muestra primero una **vista previa**; los productos que no están en el Excel aparecen en "No están en el Excel" con la opción **Mantener** (por defecto). Solo se eliminan o desactivan los que marques a propósito. Ver [8.9](#89-importar-excel-con-vista-previa).

---

## 11. Mantenimiento y copias de seguridad

Esta sección es para quien administra el sistema, no para el uso diario.

### Copia de seguridad de la base de datos

**Es lo más importante de esta sección.** El plan gratuito de la base de datos **no hace copias automáticas**, y la importación de Excel es una operación que **no se puede deshacer**.

**No alcanza con guardar el Excel del contable.** Las fotos de los productos no están ahí: se suben aparte y el enlace queda guardado en la base. Si se perdiera la base, reimportar el Excel devolvería los productos **sin ninguna imagen**. Tampoco están en el Excel los pedidos, los técnicos registrados, los banners ni la configuración del sitio.

**Cuándo hacerla:** **siempre antes de importar un Excel**, y una vez por semana.

**Cómo:**
```bash
cd Backend
MONGO_URI="la-cadena-de-conexión" node src/scripts/backup.js
```

Genera un archivo en `backups/` con la fecha. **Copialo a Drive o a un disco externo**, no lo dejes solo en la computadora.

Para restaurar:
```bash
MONGO_URI="..." node src/scripts/backup.js --restaurar backups/el-archivo.json
```
Así solo **muestra** qué haría, sin tocar nada. Se aplica agregando `--confirmar` al final.

> El archivo tiene **datos personales** (teléfonos de clientes, CUIT de técnicos). Guardalo en un lugar privado y no lo subas a ningún repositorio.

> **Probá que la copia funcione antes de confiar en ella.** Hacé una copia y restaurala en una base **de prueba** (cambiando el nombre al final de la cadena de conexión). Una copia que nunca se restauró no es una copia.

### Si se pierde la contraseña de administrador

**Primero probá lo fácil:** si queda **otro administrador con acceso total**, entra él y se la cambia desde **Gestión → Administradores** con el botón de la llave (ver [8.12](#812-administradores-y-niveles-de-acceso)). No hace falta nada más.

Lo de abajo es para el caso feo: **se perdió la contraseña del único administrador con acceso total** y no hay quién la cambie desde adentro. El panel no tiene "olvidé mi contraseña" para administradores (sí para los técnicos), así que se cambia con un comando:

```bash
cd Backend
MONGO_URI="la-cadena-de-conexión" node src/scripts/resetAdminPassword.js admin laNuevaContraseña
```

Reemplazando `admin` por el nombre de usuario y poniendo la contraseña nueva al final (mínimo 12 caracteres).

- Si el usuario no existe, el comando **lista los administradores que hay** en la base, así que sirve también para recordar cuál es el nombre.
- Al cambiarla **se cierran todas las sesiones abiertas** en todos los dispositivos.

> **No uses `seedAdmin.js` para esto.** Ese script solo crea el primer administrador: si ya existe, avisa "ya existe, no se hicieron cambios" y **no cambia nada**. Es un error fácil de cometer porque parece que funcionó.

### Si el sitio se cae

Hay un chequeo automático en `/health` que verifica también la conexión a la base. Se puede conectar a un monitor gratuito (UptimeRobot) para recibir un aviso por mail. Dos direcciones a vigilar:

- El sitio: `https://www.refrigeracionayp.com`
- La API: `…/health` — esta es la importante, porque detecta el caso en que el sitio abre pero nada funciona.

### Importar Excel de origen desconocido

Ver la advertencia en [8.9](#89-importar-excel-con-vista-previa): importar **solo** el archivo del sistema contable.

---

*Manual actualizado — A&P Refrigeración*
