import configModel from "../services/models/configModel.js";
import productModel from "../services/models/productModel.js";

export async function updateExchangeRate(req, res) {
  const { exchangeRate } = req.body;
  const rate = Number(exchangeRate);
  if (exchangeRate == null || isNaN(rate) || rate <= 0) {
    return res.status(400).json({ message: "La cotización debe ser un número mayor a 0" });
  }

  try {
    const cfg = await configModel.findOneAndUpdate(
      {},
      { exchangeRate: rate },
      { new: true, upsert: true }
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
    res
      .status(500)
      .json({ message: "Error updating exchange rate", error: err.message });
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
    res
      .status(500)
      .json({ message: "Error fetching exchange rate", error: error.message });
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
    res.status(500).json({
      message: "Error actualizando configuración",
      error: err.message,
    });
  }
};
