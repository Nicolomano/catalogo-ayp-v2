import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Order from "../services/models/orderModel.js";
import Config from "../services/models/configModel.js";
import SiteConfig from "../services/models/siteConfigModel.js";
import Product from "../services/models/productModel.js";
import serviceUserModel from "../services/models/serviceUserModel.js";
import config from "../config/config.js";

const JWT_SECRET = config.jwtSecret;
const SERVICE_DISCOUNT = 0.9; // 10% off para técnicos aprobados
const MAX_QTY = 999;
const MAX_ITEMS = 100; // productos distintos por pedido

// helper para formatear texto del detalle
const formatMoney = (n) => {
  if (typeof n !== "number") return n;
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * ¿Quien hace el pedido es un técnico service aprobado?
 *
 * El pedido es público (no hace falta estar logueado), así que el token es
 * opcional: si viene y es válido, se releé el usuario de la base. No alcanza con
 * el `approved` del token porque dura 7 días y el admin puede haber revocado la
 * cuenta en el medio.
 */
async function esServiceAprobado(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const payload = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    if (payload.role !== "service") return false;
    const user = await serviceUserModel.findById(payload.id).select("approved").lean();
    return user?.approved === true;
  } catch {
    return false; // token vencido o inválido → precio de lista
  }
}

export const createOrder = async (req, res) => {
  try {
    const { products, customerName, customerPhone } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: "La orden debe incluir productos." });
    }
    // Sin tope entraban ~1900 ítems en el body, y cada uno era una consulta
    // secuencial a la base dentro de la misma request.
    if (products.length > MAX_ITEMS) {
      return res
        .status(400)
        .json({ message: `El pedido no puede tener más de ${MAX_ITEMS} productos distintos.` });
    }
    if (typeof customerName !== "string" || typeof customerPhone !== "string") {
      return res.status(400).json({ message: "Datos del cliente inválidos." });
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      return res
        .status(400)
        .json({ message: "Faltan datos del cliente (nombre y teléfono)." });
    }
    if (customerName.length > 120 || customerPhone.length > 40) {
      return res.status(400).json({ message: "Datos del cliente demasiado largos." });
    }

    // Tomamos la cotización y el número de WhatsApp del LOCAL desde la DB
    const [cfg, siteCfg] = await Promise.all([Config.findOne(), SiteConfig.findOne()]);
    const exchangeRate = cfg?.exchangeRate || 1;
    const storeWhatsApp = (siteCfg?.whatsapp || "").replace(/\D/g, "");

    const conDescuento = await esServiceAprobado(req);

    let totalUSD = 0;
    let totalARS = 0;
    const orderProducts = [];
    // Ítems que no se pudieron incluir. El carrito vive en localStorage sin
    // vencimiento, así que es normal que traiga cosas que ya no están a la venta;
    // antes se descartaban en silencio y el cliente se enteraba de menos.
    const descartados = [];

    // Una sola consulta para todo el pedido, en vez de un findOne por ítem
    // dentro del loop. Los ids se validan antes: un {"$ne":null} en productId
    // seleccionaba un producto arbitrario.
    const idsValidos = products
      .map((it) => it.productId)
      .filter((id) => mongoose.isValidObjectId(id));
    const encontrados = idsValidos.length
      ? await Product.find({ _id: { $in: idsValidos }, active: true })
      : [];
    const porId = new Map(encontrados.map((p) => [String(p._id), p]));

    // Releemos cada producto desde DB para evitar manipulación del precio
    for (const item of products) {
      // Solo productos publicados: uno desactivado desde el admin (o por el
      // import) no se puede pedir aunque haya quedado en el carrito.
      const prod = porId.get(String(item.productId));
      if (!prod) {
        descartados.push({ productId: String(item.productId), motivo: "no disponible" });
        continue;
      }
      if (prod.inStock === false) {
        descartados.push({ productId: item.productId, name: prod.name, motivo: "sin stock" });
        continue;
      }

      // Number.isInteger descarta NaN, decimales y negativos de una.
      // Ojo: `qty <= 0` NO alcanzaba, porque NaN <= 0 es false y NaN pasaba.
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY) {
        descartados.push({ productId: item.productId, name: prod.name, motivo: "cantidad inválida" });
        continue;
      }

      // Los productos fijados en ARS no tienen priceUSD → evitar NaN en los totales
      const baseUSD = Number(prod.priceUSD) || 0;
      const baseARS = Number(prod.priceARS) || 0;
      // El descuento se aplica ACÁ, del lado servidor. Antes solo existía en el
      // render de las tarjetas: el técnico veía un precio y se le cotizaba otro.
      const priceUSD = conDescuento ? baseUSD * SERVICE_DISCOUNT : baseUSD;
      const priceARS = conDescuento ? Math.round(baseARS * SERVICE_DISCOUNT) : baseARS;

      totalUSD += priceUSD * qty;
      totalARS += priceARS * qty;

      orderProducts.push({
        productId: prod._id,
        name: prod.name,
        productCode: prod.productCode,
        quantity: qty,
        priceUSD,
        priceARS,
      });
    }

    if (orderProducts.length === 0) {
      return res.status(400).json({
        message:
          "Ninguno de los productos del pedido está disponible. Actualizá la página e intentá de nuevo.",
        descartados,
      });
    }

    const newOrder = new Order({
      products: orderProducts,
      totalUSD,
      totalARS,
      customerName,
      customerPhone,
    });
    await newOrder.save();

    // Recién ahora se suman las ventas: antes el $inc iba dentro del loop, así
    // que un fallo al guardar dejaba los contadores inflados sin ninguna orden
    // detrás (y "Más vendidos" ordena por este campo).
    await Promise.all(
      orderProducts.map((p) =>
        Product.updateOne({ _id: p.productId }, { $inc: { soldCount: p.quantity } })
      )
    ).catch((e) => console.error("No se pudo actualizar soldCount:", e.message));

    // Texto de WhatsApp: va dirigido AL LOCAL
    const lines = orderProducts
      .map(
        (p) =>
          `• ${p.quantity}× ${p.name} (Código: ${
            p.productCode
          }) — ${formatMoney(p.priceARS * p.quantity)} ARS (${formatMoney(
            p.priceARS
          )} c/u)`
      )
      .join("\n");

    const text = encodeURIComponent(
      `🛒 Nueva orden\n\n` +
        `${lines}\n\n` +
        `Total:  ${formatMoney(totalARS)} ARS\n` +
        (conDescuento ? `(Precios con descuento service -10%)\n` : "") +
        `Cotización aplicada: ${formatMoney(exchangeRate)} ARS/USD\n\n` +
        `👤 Cliente: ${customerName}\n` +
        `📞 Tel: ${customerPhone}`
    );

    // IMPORTANTE: el número es el del LOCAL (para que el cliente inicie el chat hacia el negocio)
    const waLink = storeWhatsApp ? `https://wa.me/${storeWhatsApp}?text=${text}` : null;
    // Alternativa compatible:
    // const waLink = `https://api.whatsapp.com/send?phone=${waPhone}&text=${text}`;

    res.status(201).json({ order: newOrder, waLink, descartados });
  } catch (error) {
    console.error("❌ Error creando orden:", error);
    res
      .status(400)
      .json({ message: "Error creando orden", error: error?.message || error });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo órdenes",
      error: error?.message || error,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });
    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo orden",
      error: error?.message || error,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pendiente", "contestada"].includes(status)) {  // debe coincidir con el enum del modelo
      return res.status(400).json({ message: "Estado inválido" });
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "Error actualizando estado de orden",
      error: error.message,
    });
  }
};
