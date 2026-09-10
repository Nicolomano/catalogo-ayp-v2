import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { apiLimiter } from "./src/middlewares/rateLimiters.js";
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
import metricsRouter from "./src/routes/metricsRoutes.js";
import corsOptions from "./src/utils/cors.js";
import productModel from "./src/services/models/productModel.js";
import orderModel from "./src/services/models/orderModel.js";
import searchLogModel from "./src/services/models/searchLogModel.js";
import pageViewModel from "./src/services/models/pageViewModel.js";

const app = express();
const SERVER_PORT = process.env.PORT || 8080;

// Railway sirve detrás de un proxy: sin esto req.ip es la IP del proxy y los
// límites por IP se aplicarían a todos los usuarios juntos. El 1 es la cantidad
// de proxies de confianza (no usar `true`, que acepta cualquier X-Forwarded-For).
app.set("trust proxy", 1);

// Cabeceras de seguridad. La CSP la sirve Vercel para el HTML (ver
// frontend/vercel.json); acá solo se responde JSON, así que alcanza con el resto.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.disable("x-powered-by");

app.use(compression()); // gzip de las respuestas JSON de la API
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cors(corsOptions));

// Techo general por IP para toda la API (los límites de login/registro/pedidos
// se aplican además de este, en sus rutas).
app.use("/api", apiLimiter);

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
app.use("/api/metrics", metricsRouter);

/**
 * Chequeo de salud para el monitor de caída.
 *
 * Verifica la conexión a la base, no solo que el proceso esté vivo: el caso
 * peligroso es que el server responda pero Mongo esté caído, porque ahí el
 * sitio "anda" y todo devuelve error. Devuelve 503 en ese caso para que el
 * monitor avise.
 */
app.get("/health", (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    db: dbOk ? "conectada" : "sin conexión",
    uptime: Math.round(process.uptime()),
  });
});

// El sitemap lo sirve el frontend en www.refrigeracionayp.com/sitemap.xml
// (frontend/api/sitemap.js), que es el que referencia robots.txt. Acá había una
// segunda versión que nadie consumía y que caía al dominio viejo si faltaba
// FRONTEND_URL. El índice de productos lo expone GET /api/products/sitemap.

app.use((req, res) => {
  res.status(404).send("Ruta no encontrada");
});

app.use((err, req, res, next) => {
  // Id corto para poder cruzar lo que ve el usuario con el log del servidor.
  const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.error(`[${ref}] Error capturado:`, err);
  // Asegurar headers de CORS también en errores, así el browser muestra el
  // error real (500 con mensaje) en vez de un error de CORS genérico.
  const origin = req.headers.origin;
  const allowed = Array.isArray(corsOptions.origin) ? corsOptions.origin : [];
  if (origin && allowed.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }
  // No se devuelve err.message: filtraba el nombre de la base y de las
  // colecciones (errores E11000), los campos del schema (CastError,
  // ValidationError) y, desde el registro público, el mensaje crudo de libvips,
  // que identifica el decodificador que alguien querría atacar.
  res.status(500).json({
    message: "Error interno del servidor",
    ref,
  });
});

const httpServer = app.listen(SERVER_PORT, () => {
  console.log("server run on port:", SERVER_PORT);
});

// El default de Node (requestTimeout = 300000 ms = 5 min) cortaba la importación
// de Excel grande antes de que el server respondiera. Subimos a 15 min.
httpServer.requestTimeout = 900000;
// headersTimeout queda en el default (60s) a propósito: subirlo a 15 min hacía
// que mantener sockets abiertos mandando un byte de header cada tanto costara
// nada (slowloris). Los headers de un upload llegan en milisegundos; lo que
// tarda es el cuerpo, y eso lo gobierna requestTimeout.

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
    // Los índices nuevos de pedidos y del log de búsquedas: sin esto, cualquier
    // métrica por rango de fechas escanea la colección entera.
    await orderModel.syncIndexes();
    await searchLogModel.syncIndexes();
    await pageViewModel.syncIndexes();
  } catch (e) {
    console.error("Error syncing product indexes:", e.message);
  }
});
