import express from "express";
import cors from "cors";
import mongoose from "mongoose";
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
import userRouter from "./src/routes/userRoutes.js";
import tecnicoRouter from "./src/routes/tecnicoRoutes.js";
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
app.use("/api/users", userRouter);
app.use("/api/tecnicos", tecnicoRouter);

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
  // Asegurar headers de CORS también en errores, así el browser muestra el
  // error real (500 con mensaje) en vez de un error de CORS genérico.
  const origin = req.headers.origin;
  const allowed = Array.isArray(corsOptions.origin) ? corsOptions.origin : [];
  if (origin && allowed.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }
  res.status(500).json({
    message: "Error interno del servidor",
    error: err.message,
  });
});

const httpServer = app.listen(SERVER_PORT, () => {
  console.log("server run on port:", SERVER_PORT);
});

// El default de Node (requestTimeout = 300000 ms = 5 min) cortaba la importación
// de Excel grande antes de que el server respondiera. Subimos a 15 min.
httpServer.requestTimeout = 900000;
httpServer.headersTimeout = 920000;

const connectMongoDB = async () => {
  try {
    MongoSingleton.getInstance();
  } catch (error) {
    console.error(error);
  }
};

connectMongoDB();

// Una vez conectado, elimina el índice viejo de productos que combinaba
// categories+subcategories (MongoDB rechaza inserts por "parallel arrays").
mongoose.connection.once("open", async () => {
  try {
    const indexes = await productModel.collection.indexes();
    const bad = indexes.find(
      (i) => i.key && i.key.categories === 1 && i.key.subcategories === 1,
    );
    if (bad) {
      await productModel.collection.dropIndex(bad.name);
      console.log(`Dropped legacy parallel-arrays index: ${bad.name}`);
    }
    await productModel.syncIndexes();
  } catch (e) {
    console.error("Error syncing product indexes:", e.message);
  }
});
