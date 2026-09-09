import configModel from "../services/models/configModel.js";
import productModel from "../services/models/productModel.js";

export async function updateExchangeRate(req, res) {
  const { exchangeRate } = req.body;
  const rate = Number(exchangeRate);
  if (exchangeRate == null || isNaN(rate) || rate <= 0) {
    return res.status(400).json({ message: "La cotización debe ser un número mayor a 0" });
  }

  try {
    // Un dedazo en la cotización (1200000 en vez de 1200) reescribe el precio de
    // todo el catálogo. Es reversible —el pipeline recalcula desde priceUSD—,
    // pero las órdenes que entren en el medio CONGELAN el precio roto. Por eso
    // un salto grande necesita confirmación explícita.
    const actual = await configModel.findOne().lean();
    const anterior = Number(actual?.exchangeRate) || 0;
    if (anterior > 0 && String(req.body.confirmBigChange) !== "true") {
      const variacion = Math.abs(rate - anterior) / anterior;
      if (variacion > 0.3) {
        return res.status(409).json({
          message:
            `La cotización pasaría de ${anterior} a ${rate} (${Math.round(variacion * 100)}% de cambio). ` +
            `Si es correcto, confirmá para aplicarlo a todo el catálogo.`,
          requiresConfirm: true,
          anterior,
          nuevo: rate,
        });
      }
    }

    const cfg = await configModel.findOneAndUpdate(
      {},
      { exchangeRate: rate },
      { new: true, upsert: true, runValidators: true }
    );

    // Recalcular solo cuando haya priceUSD y no sea fijo en ARS.
    // Si fixedInARS=true o priceUSD es null/ausente → mantener priceARS actual
    // (así evitamos poner precios en 0 a productos sin USD).
    await productModel.updateMany(
      {},
      [
        {
          $set: {
            priceARS: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$fixedInARS", true] },
                    { $eq: [{ $ifNull: ["$priceUSD", null] }, null] },
                  ],
                },
                "$priceARS",
                { $multiply: ["$priceUSD", rate] },
              ],
            },
          },
        },
      ]
    );

    res.json({ ok: true, exchangeRate: cfg.exchangeRate });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error updating exchange rate"});
  }
}

export async function getExchangeRate(req, res) {
  try {
    const config = await configModel.findOne();
    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }
    res.status(200).json({ exchangeRate: config.exchangeRate });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching exchange rate"});
  }
}

export const getInstallKit = async (req, res) => {
  const cfg = await configModel.findOne({}, { installKit: 1 });
  res.json(cfg?.installKit || { items: [] });
};

export const updateInstallKit = async (req, res) => {
  try {
    const { installKit } = req.body;
    const cfg = await configModel.findOneAndUpdate(
      {},
      { installKit },
      { new: true, upsert: true }
    );
    res.json(cfg.installKit);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error actualizando configuración",
    });
  }
};
