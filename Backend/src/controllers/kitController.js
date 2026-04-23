// controllers/kitController.js
import configModel from "../services/models/configModel.js";
import productModel from "../services/models/productModel.js";

export const priceInstallKit = async (req, res) => {
  const { quantities = {}, variant = {} } = req.body || {};
  const cfg = await configModel.findOne().lean();
  const items = cfg?.installKit?.items || [];
  const exchangeRate = Number(cfg?.exchangeRate || 1);

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
  const products = await productModel
    .find({ productCode: { $in: [...codes] } })
    .lean();
  const byCode = new Map(products.map((p) => [p.productCode, p]));

  const lines = [];
  for (const item of items) {
    const qty = Number(quantities[item.key] ?? item.defaultQty ?? 0);
    if (qty <= 0) continue;

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
    if (!prod) continue;

    const unitPriceARS = prod.fixedInARS
      ? Number(prod.priceARS || 0)
      : Number(prod.priceUSD || 0) * exchangeRate;

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
  res.json({ lines, total });
};
