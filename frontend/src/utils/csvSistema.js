/**
 * Detalle de un pedido en el CSV que lee el sistema contable, para cargarlo con
 * "Detalle de Proforma → Importar detalle desde archivo CSV → Usar IdArticulo".
 *
 * El formato es el mismo que el sistema exporta ("Exportar detalle a archivo
 * CSV"): separado por punto y coma, con estos encabezados y sin BOM (un BOM
 * pegado a "IdArticulo" haría que no reconozca la columna).
 *
 * El código del sitio es el Código de Catálogo del Excel, que en el sistema es
 * el IdArticulo. Van el código y la cantidad; el precio queda vacío a propósito
 * para que lo ponga el sistema con su lista, y no un precio del sitio que puede
 * estar viejo.
 */
const ENCABEZADOS = [
  "IdArticulo", "Codigo", "CodigoCatalogo", "CodigoOriginal", "Codigo_Marca",
  "Descripcion", "Cantidad", "Precio", "SubTotal",
];

// Sin tildes ni punto y coma: la descripción es solo de referencia (el sistema
// busca por IdArticulo) y así no importa con qué codificación lea el archivo.
const limpiar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[;"]/g, " ")
    .trim();

/**
 * Una fila por artículo. Los combos no existen en el sistema: van sus piezas,
 * con la cantidad ya multiplicada. Si un artículo aparece más de una vez (suelto
 * y dentro de un combo), se suma en una sola fila.
 */
export function filasParaSistema(order) {
  const porCodigo = new Map();
  const sumar = (productCode, name, quantity) => {
    const codigo = String(productCode ?? "").trim();
    const cantidad = Number(quantity) || 0;
    if (!codigo || cantidad <= 0) return;
    const previa = porCodigo.get(codigo);
    if (previa) previa.cantidad += cantidad;
    else porCodigo.set(codigo, { codigo, descripcion: limpiar(name), cantidad });
  };

  for (const p of order?.products || []) {
    if (p.componentes?.length) {
      for (const c of p.componentes) sumar(c.productCode, c.name, c.quantity);
    } else {
      sumar(p.productCode, p.name, p.quantity);
    }
  }
  return [...porCodigo.values()];
}

export function csvParaSistema(order) {
  const lineas = filasParaSistema(order).map((f) =>
    [f.codigo, "", "", "", "", f.descripcion, f.cantidad, "", ""].join(";")
  );
  return [ENCABEZADOS.join(";"), ...lineas].join("\r\n") + "\r\n";
}

export function descargarCsvParaSistema(order) {
  const blob = new Blob([csvParaSistema(order)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const fecha = new Date(order.createdAt || Date.now()).toISOString().slice(0, 10);
  const cliente = limpiar(order.customerName).replace(/\s+/g, "_").slice(0, 30) || "cliente";
  const a = document.createElement("a");
  a.href = url;
  a.download = `Pedido_${fecha}_${cliente}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
