import Order from "../services/models/orderModel.js";
import Product from "../services/models/productModel.js";
import ServiceUser from "../services/models/serviceUserModel.js";
import SearchLog from "../services/models/searchLogModel.js";

/**
 * Métricas del negocio a partir de lo que ya se guarda.
 *
 * El dashboard hasta ahora eran cuatro conteos de productos: no consultaba la
 * colección de pedidos en ningún momento, así que fechas, montos, estados,
 * productos pedidos y el embudo de técnicos estaban sin usar.
 */
export const getMetrics = async (req, res) => {
  try {
    const dias = Math.max(1, Math.min(365, Number(req.query.dias) || 30));
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const enRango = { createdAt: { $gte: desde } };

    const [
      resumenPedidos,
      serieDiaria,
      pendientes,
      topPedidos,
      mirados,
      topBusquedas,
      sinResultados,
      embudoTecnicos,
      tecnicosNuevos,
      pendientesViejos,
    ] = await Promise.all([
      // Cantidad, facturación y ticket promedio del período
      Order.aggregate([
        { $match: enRango },
        {
          $group: {
            _id: null,
            pedidos: { $sum: 1 },
            facturacion: { $sum: "$totalARS" },
            ticketPromedio: { $avg: "$totalARS" },
          },
        },
      ]),

      // Serie por día, para el gráfico
      Order.aggregate([
        { $match: enRango },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            pedidos: { $sum: 1 },
            facturacion: { $sum: "$totalARS" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Pedidos sin responder (de todo el histórico, no solo del período)
      Order.aggregate([
        { $match: { status: "pendiente" } },
        { $group: { _id: null, cantidad: { $sum: 1 }, masViejo: { $min: "$createdAt" } } },
      ]),

      // Productos más pedidos del período. Sale de los ítems de las órdenes y no
      // de soldCount, que es un acumulado sin fecha y no se puede filtrar.
      Order.aggregate([
        { $match: enRango },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.productCode",
            name: { $first: "$products.name" },
            unidades: { $sum: "$products.quantity" },
            pedidos: { $sum: 1 },
          },
        },
        { $sort: { unidades: -1 } },
        { $limit: 10 },
      ]),

      // Mucho vistos y poco pedidos: casi siempre es precio, foto o stock.
      Product.find({ active: true, views: { $gte: 20 } })
        .select("productCode name views soldCount priceARS inStock")
        .sort({ views: -1 })
        .limit(100)
        .lean(),

      SearchLog.aggregate([
        { $match: enRango },
        { $group: { _id: "$term", veces: { $sum: 1 }, resultados: { $max: "$resultCount" } } },
        { $sort: { veces: -1 } },
        { $limit: 10 },
      ]),

      // Lo más valioso: qué le piden y no tiene.
      SearchLog.aggregate([
        { $match: { ...enRango, resultCount: 0 } },
        { $group: { _id: "$term", veces: { $sum: 1 }, ultima: { $max: "$createdAt" } } },
        { $sort: { veces: -1 } },
        { $limit: 15 },
      ]),

      ServiceUser.aggregate([{ $group: { _id: "$status", cantidad: { $sum: 1 } } }]),

      ServiceUser.countDocuments(enRango),

      ServiceUser.countDocuments({
        status: "pending",
        createdAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const r = resumenPedidos[0] || { pedidos: 0, facturacion: 0, ticketPromedio: 0 };
    const p = pendientes[0] || { cantidad: 0, masViejo: null };

    // Ratio vista→pedido, calculado acá y no en Mongo para poder ordenar por el
    // "desperdicio" (vistas sin pedido) en vez de por vistas crudas.
    const pocaConversion = mirados
      .map((prod) => ({
        productCode: prod.productCode,
        name: prod.name,
        views: prod.views,
        soldCount: prod.soldCount || 0,
        inStock: prod.inStock,
        priceARS: prod.priceARS,
        conversion: prod.views ? (prod.soldCount || 0) / prod.views : 0,
      }))
      .sort((a, b) => a.conversion - b.conversion || b.views - a.views)
      .slice(0, 10);

    const embudo = { pending: 0, approved: 0, rejected: 0 };
    for (const e of embudoTecnicos) if (e._id in embudo) embudo[e._id] = e.cantidad;

    res.set("Cache-Control", "private, max-age=60");
    res.json({
      dias,
      pedidos: {
        cantidad: r.pedidos,
        facturacion: Math.round(r.facturacion || 0),
        ticketPromedio: Math.round(r.ticketPromedio || 0),
        pendientes: p.cantidad,
        pendienteMasViejo: p.masViejo,
        serie: serieDiaria.map((d) => ({
          fecha: d._id,
          pedidos: d.pedidos,
          facturacion: Math.round(d.facturacion || 0),
        })),
      },
      productos: {
        topPedidos: topPedidos.map((t) => ({
          productCode: t._id,
          name: t.name,
          unidades: t.unidades,
          pedidos: t.pedidos,
        })),
        pocaConversion,
      },
      busquedas: {
        top: topBusquedas.map((b) => ({ term: b._id, veces: b.veces, resultados: b.resultados })),
        sinResultados: sinResultados.map((b) => ({
          term: b._id,
          veces: b.veces,
          ultima: b.ultima,
        })),
      },
      tecnicos: { ...embudo, nuevos: tecnicosNuevos, pendientesViejos },
    });
  } catch (error) {
    console.error("Error calculando métricas:", error);
    res.status(500).json({ message: "No se pudieron calcular las métricas" });
  }
};
