import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";

// Cargar el mismo .env que usa el resto del backend
const env = process.env.NODE_ENV === "production" ? "production" : "development";
dotenv.config({ path: path.resolve("./src/config/.env." + env) });

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET     = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_CONFIGURED = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && BUCKET);

export const s3 = R2_CONFIGURED
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

export async function uploadToR2(buffer, key, mimeType = "image/webp") {
  if (!R2_CONFIGURED || !s3) {
    throw new Error("R2 no está configurado. Completá las variables R2_* en el archivo .env.");
  }
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  await s3.send(command);
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3.send(command);
}

export function keyFromUrl(url) {
  if (!url || !PUBLIC_URL) return null;
  return url.replace(`${PUBLIC_URL}/`, "");
}
