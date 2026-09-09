import SiteConfig from "../services/models/siteConfigModel.js";

/**
 * Corta las escrituras públicas cuando el modo mantenimiento está activo.
 *
 * Antes `maintenanceMode` solo lo miraba el navegador: con el modo prendido la
 * API seguía aceptando pedidos igual. Si se prende justo porque hay un problema
 * con los precios, se seguían registrando órdenes con esos precios.
 *
 * El admin pasa igual, para poder revisar el sitio mientras está en mantenimiento.
 */

let cache = { valor: false, hasta: 0 };
const TTL = 15 * 1000; // evita una query por request sin quedar desactualizado

async function enMantenimiento() {
  if (Date.now() < cache.hasta) return cache.valor;
  try {
    const cfg = await SiteConfig.findOne().select("maintenanceMode").lean();
    cache = { valor: cfg?.maintenanceMode === true, hasta: Date.now() + TTL };
  } catch {
    // Ante un fallo de la base no bloqueamos el sitio.
    cache = { valor: false, hasta: Date.now() + TTL };
  }
  return cache.valor;
}

export const blockOnMaintenance = async (req, res, next) => {
  if (req.user?.role === "admin") return next();
  if (await enMantenimiento()) {
    return res.status(503).json({
      message:
        "El sitio está en mantenimiento por unos minutos. Escribinos por WhatsApp si necesitás algo urgente.",
      maintenance: true,
    });
  }
  next();
};
