// controllers/kitController.js
import configModel from "../services/models/configModel.js";
import productModel from "../services/models/productModel.js";
import { esServiceAprobado, SERVICE_DISCOUNT } from "./orderController.js";

const MAX_QTY = 9999;

export const priceInstallKit = async (req, res) => {
  try {
    const { quantities = {}, variant = {} } = req.body || {};
    const cfg = await configModel.findOne().lean();
    const items = cfg?.installKit?.items || [];
    const exchangeRate = Number(cfg?.exchangeRate) || 1;

    // El descuento se calculaba en el navegador y se escribía en el WhatsApp sin
    // que nadie lo validara. Ahora sale del servidor, igual que en los pedidos.
    const conDescuento = await esServiceAprobado(req);
    const aplicar = (v) => (conDescuento ? v * SERVICE_DISCOUNT : v);

    // Pre-cargar todos los productCodes a consultar (mejor performance)
    const codes = new Set();
    for (const it of items) {
      if (Array.isArray(it.variants) && variant[it.key]) {
        const match = it.variants.find(
          (v) => v.value === String(variant[it.key])
        );
        if (match?.productCode) codes.add(match.productCode);
      } else if (it.productCode) {
        codes.add(it.productCode);
      }
    }
    // Solo productos publicados: si el admin desactiva un caño, la calculadora
    // no puede seguir cotizándolo.
    const products = await productModel
      .find({ productCode: { $in: [...codes] }, active: true })
      .lean();
    const byCode = new Map(products.map((p) => [p.productCode, p]));

    const lines = [];
    // Ítems configurados en el kit que ya no existen o están desactivados: antes
    // desaparecían del total en silencio y la cotización salía más barata.
    const faltantes = [];

    for (const item of items) {
      const qty = Number(quantities[item.key] ?? item.defaultQty ?? 0);
      // `qty <= 0` no filtraba NaN (NaN <= 0 es false).
      if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) continue;

      // Resolver productCode por variante (genérico)
      let pc = item.productCode;
      if (Array.isArray(item.variants) && variant[item.key]) {
        const match = item.variants.find(
          (v) => v.value === String(variant[item.key])
        );
        pc = match?.productCode || pc;
      }
      if (!pc) continue;

      const prod = byCode.get(pc);
      if (!prod) {
        faltantes.push({ key: item.key, label: item.label });
        continue;
      }

      const base = prod.fixedInARS
        ? Number(prod.priceARS || 0)
        : Number(prod.priceUSD || 0) * exchangeRate;

      // Redondeado: sin esto el cliente sin descuento veía centavos ("$12.876,79")
      // y el técnico no, porque el front solo redondeaba el precio con descuento.
      const unitPriceARS = Math.round(aplicar(base));
      const subtotal = unitPriceARS * qty;

      lines.push({
        key: item.key,
        label: item.label,
        unit: item.unit,
        qty,
        variant: variant[item.key] || null, // ← útil para mostrar en front
        productCode: pc,
        unitPriceARS,
        subtotal,
      });
    }

    const total = lines.reduce((a, b) => a + b.subtotal, 0);
    res.json({ lines, total, conDescuento, faltantes });
  } catch (error) {
    console.error("Error cotizando kit:", error);
    res.status(500).json({ message: "No se pudo calcular el kit" });
  }
};
