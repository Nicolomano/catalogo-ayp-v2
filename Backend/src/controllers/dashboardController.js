import Product from "../services/models/productModel.js";
import Config from "../services/models/configModel.js";

export const getDashboardData = async (req, res) => {
  try {
    const totalProductos = await Product.countDocuments();
    const productosActivos = await Product.countDocuments({ active: true });
    const productosInactivos = await Product.countDocuments({ active: false });
    const config = await Config.findOne();

    res.json({
      totalProductos,
      productosActivos,
      productosInactivos,
      exchangeRate: config?.exchangeRate || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener dashboard" });
  }
};
