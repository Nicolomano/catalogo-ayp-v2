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
9. [Modo oscuro](#9-modo-oscuro)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)

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
2. Escribir el email y contraseña de administrador
3. Hacer clic en **"Ingresar"**

> ⚠️ El token de sesión se guarda en el navegador. Si cerrás la pestaña, la sesión se mantiene. Para cerrar sesión, borrar el historial/datos del navegador o usar el botón de logout si está disponible.

---

## 2. Navegación general

### Menú principal
El menú superior está siempre visible y contiene:

| Sección | Descripción |
|---|---|
| **Inicio** | Página de bienvenida con productos destacados |
| **Catálogo** | Listado completo de productos con filtros |
| **Kit** | Calculadora de kit de instalación |
| **Contacto** | Dirección, teléfono, WhatsApp y mapa |
| **Admin** | Visible solo si se inició sesión como administrador |

### En celular
El menú se colapsa en un botón de hamburguesa (≡) en la esquina superior derecha. Al tocarlo se despliega el menú completo.

### Botón de carrito
El ícono de carrito (🛒) en la esquina superior derecha muestra un número en rojo con la cantidad de artículos agregados. Al tocarlo se va a la pantalla de pedido.

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
- Imagen
- Marca (si tiene)
- Nombre
- Precio en ARS
- Cuotas (precio en 6 cuotas con interés)
- Indicador de **Sin stock** (si aplica)
- Selector de cantidad (−/+)
- Botón **"Agregar"**

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
   - Contraseña (mínimo 6 caracteres)
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
   - **Precio:** Elegir entre precio fijo en ARS o calcular desde USD
     - Si se marca **"Precio fijo en ARS"**: ingresar el precio en pesos (y opcionalmente en USD)
     - Si no: ingresar el precio en USD, el sistema lo convierte usando la cotización configurada
   - **Categorías:** Seleccionar una o más (aparecen como botones)
   - **Subcategorías:** Se habilitan según las categorías seleccionadas
   - **Imagen:** Opcional, se puede subir desde el dispositivo
3. Clic en **"Guardar"**

#### Editar un producto
Clic en **"Editar"** en la tarjeta del producto. Se abre el mismo formulario con los datos actuales. Modificar lo necesario y guardar.

#### Eliminar un producto
Clic en **"Eliminar"** (rojo). El sistema pide confirmación antes de proceder.

> ⚠️ La eliminación es permanente. Si solo se quiere ocultar del catálogo, usar **"Desactivar"** en su lugar.

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

#### Crear un banner
1. Seleccionar el tipo: **"Home (hero)"** o **"Catálogo"**
2. Clic en **"+ Nuevo banner"**
3. Completar:
   - **Título** (aparece sobre la imagen)
   - **Subtítulo** (texto secundario, opcional)
   - **Link:** URL a donde lleva al hacer clic (ej: `/catalogo?cat=Compresores`). Opcional.
   - **Tipo:** Home o Catálogo
   - **Orden:** Número que determina la posición en el carrusel (1 = primero)
   - **Estado:** Activo o Inactivo
   - **Imagen:** Subir desde el dispositivo
     > Tamaño recomendado: cuadrada, mínimo 900×900px. El sistema la recorta automáticamente.
4. Clic en **"Guardar"**

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

#### Cambiar el estado de una orden
Clic en **"Marcar como contestada"** / **"Marcar como pendiente"** para alternar el estado. Esto sirve para llevar control interno de cuáles pedidos ya fueron atendidos.

> Las órdenes llegan principalmente por WhatsApp. Este registro es un complemento para tener historial.

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

#### Cotización del dólar
Ingresar el valor del dólar oficial o el tipo de cambio que se usa internamente para calcular los precios en ARS de los productos cargados en USD.

1. Escribir el nuevo valor en el campo
2. Clic en **"Guardar"**

> Los precios en ARS de los productos con precio en USD se recalculan automáticamente con este valor.

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

**¿Cómo sé qué precio se muestra en el catálogo si cambio la cotización del dólar?**
Los productos con precio en USD muestran el precio en ARS calculado como `precioUSD × cotización`. Al guardar una nueva cotización, los precios se actualizan de inmediato en el catálogo.

**¿Puedo tener un banner inactivo preparado para activar después?**
Sí. Crear el banner con estado **"Inactivo"** y activarlo cuando sea necesario sin necesidad de crearlo de nuevo.

**Si importo un Excel, ¿me borra los productos que no están en el archivo?**
No, salvo que vos lo pidas. La importación muestra primero una **vista previa**; los productos que no están en el Excel aparecen en "No están en el Excel" con la opción **Mantener** (por defecto). Solo se eliminan o desactivan los que marques a propósito. Ver [8.9](#89-importar-excel-con-vista-previa).

---

*Manual actualizado — A&P Refrigeración*
