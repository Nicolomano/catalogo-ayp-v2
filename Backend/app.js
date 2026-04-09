import express from "express";
import cors from "cors";
import MongoSingleton from "./src/config/mongoDB-singleton.js";
import productRouter from "./src/routes/productRoute.js";
import configRouter from "./src/routes/configRoute.js";
import orderRouter from "./src/routes/orderRoute.js";
import authRouter from "./src/routes/authRoute.js";
import bannerRoutes from "./src/routes/bannerRoutes.js";
import dashboardRouter from "./src/routes/dashboardRoute.js";
import categoryRouter from "./src/routes/categoryRoutes.js";
import kitRouter from "./src/routes/kitRoutes.js";
import siteConfigRouter from "./src/routes/siteConfigRoutes.js";
import corsOptions from "./src/utils/cors.js";
import productModel from "./src/services/models/productModel.js";

const app = express();
const SERVER_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.use("/api/products", productRouter);
app.use("/api/config", configRouter);
app.use("/api/orders", orderRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/banners", bannerRoutes);
app.use("/api/categories", categoryRouter);
app.use("/api/kits", kitRouter);
app.use("/api/site-config", siteConfigRouter);

app.get("/sitemap.xml", async (req, res) => {
  try {
    const FRONTEND_URL =
      process.env.FRONTEND_URL || "https://catalogoayp.vercel.app";

    const products = await productModel
      .find({ active: true }, "productCode updatedAt")
      .lean();

    const staticUrls = [
      { loc: FRONTEND_URL, priority: "1.0", changefreq: "daily" },
    ];

    const productUrls = products.map((p) => ({
      loc: `${FRONTEND_URL}/product/${p.productCode}`,
      priority: "0.8",
      changefreq: "weekly",
      lastmod: p.updatedAt
        ? new Date(p.updatedAt).toISOString().split("T")[0]
        : undefined,
    }));

    const allUrls = [...staticUrls, ...productUrls];

    const urlset = allUrls
      .map(
        (u) => `
  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    res.status(500).send("Error generando sitemap");
  }
});

app.use((req, res) => {
  res.status(404).send("Ruta no encontrada");
});

app.use((err, req, res, next) => {
  console.error("Error capturado:", err);
  res.status(500).json({
    message: "Error interno del servidor",
    error: err.message,
    stack: err.stack,
  });
});

const httpServer = app.listen(SERVER_PORT, () => {
  console.log("server run on port:", SERVER_PORT);
});

const connectMongoDB = async () => {
  try {
    MongoSingleton.getInstance();
  } catch (error) {
    console.error(error);
  }
};

connectMongoDB();
