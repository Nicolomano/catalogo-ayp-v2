/**
 * Script de migración: Cloudinary → Cloudflare R2
 *
 * Ejecutar desde la carpeta Backend/:
 *   node src/scripts/migrateToR2.js
 *
 * Requiere las variables de entorno de R2 configuradas en el .env
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import https from "https";
import http from "http";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { uploadToR2 } from "../utils/r2.js";
import productModel from "../services/models/productModel.js";
import Banner from "../services/models/bannerModel.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return resolve(downloadBuffer(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} para ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes("cloudinary.com");
}

const results = { success: [], failed: [], skipped: [] };

async function migrateImage(url, folder, resizeOptions) {
  const raw = await downloadBuffer(url);
  const buffer = await sharp(raw)
    .resize(resizeOptions.width, resizeOptions.height, {
      fit: resizeOptions.fit,
      position: resizeOptions.position || "center",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
  const key = `${folder}/${uuidv4()}.webp`;
  return await uploadToR2(buffer, key, "image/webp");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI no configurado");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Conectado a MongoDB");

  // ── Productos ────────────────────────────────────────────────────────────
  const products = await productModel.find({}).lean();
  console.log(`\n📦 Encontrados ${products.length} productos`);

  for (const p of products) {
    if (!isCloudinaryUrl(p.image)) {
      results.skipped.push({ type: "product", id: p._id, code: p.productCode });
      process.stdout.write("·");
      continue;
    }
    try {
      const newUrl = await migrateImage(p.image, "products", {
        width: 800,
        height: 800,
        fit: "inside",
      });
      await productModel.findByIdAndUpdate(p._id, { image: newUrl });
      results.success.push({
        type: "product",
        id: p._id,
        code: p.productCode,
        newUrl,
      });
      process.stdout.write("✓");
    } catch (err) {
      results.failed.push({
        type: "product",
        id: p._id,
        code: p.productCode,
        error: err.message,
      });
      process.stdout.write("✗");
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  // ── Banners ──────────────────────────────────────────────────────────────
  const banners = await Banner.find({}).lean();
  console.log(`\n\n🖼️  Encontrados ${banners.length} banners`);

  for (const b of banners) {
    if (!isCloudinaryUrl(b.image)) {
      results.skipped.push({ type: "banner", id: b._id });
      process.stdout.write("·");
      continue;
    }
    try {
      const newUrl = await migrateImage(b.image, "banners", {
        width: 1500,
        height: 500,
        fit: "cover",
        position: "attention",
      });
      await Banner.findByIdAndUpdate(b._id, { image: newUrl });
      results.success.push({ type: "banner", id: b._id, newUrl });
      process.stdout.write("✓");
    } catch (err) {
      results.failed.push({ type: "banner", id: b._id, error: err.message });
      process.stdout.write("✗");
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  // ── Resultados ───────────────────────────────────────────────────────────
  const logPath = "./migration-results.json";
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2));

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Exitosos:  ${results.success.length}`);
  console.log(`❌ Fallidos:  ${results.failed.length}`);
  console.log(`⏭️  Omitidos:  ${results.skipped.length}`);
  console.log(`📄 Log guardado en: ${logPath}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (results.failed.length > 0) {
    console.log("\n⚠️  Fallidos:");
    results.failed.forEach((f) => console.log(`  - ${f.type} ${f.code || f.id}: ${f.error}`));
  }

  await mongoose.disconnect();
  process.exit(results.failed.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("💥 Error fatal:", err);
  process.exit(1);
});
