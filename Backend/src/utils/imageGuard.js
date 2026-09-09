import sharp from "sharp";

/**
 * Valida que un buffer sea realmente una imagen antes de pasarlo al pipeline.
 *
 * El filtro de multer mira `file.mimetype`, que lo DECLARA el cliente: un
 * atacante manda "Content-Type: image/png" con cualquier binario y llega intacto
 * al decodificador nativo de libvips. Como el registro de técnicos es público,
 * esa era la única superficie sin autenticar que tocaba código nativo.
 *
 * Acá se decodifica el encabezado de verdad y se rechaza lo que no sea una
 * imagen soportada o sea desproporcionadamente grande (bomba de descompresión:
 * pocos KB en disco, gigabytes al descomprimir).
 */

const FORMATOS_PERMITIDOS = new Set(["jpeg", "jpg", "png", "webp"]);
const MAX_PIXELES = 40_000_000; // ~40 MP: de sobra para una foto de celular
const MAX_LADO = 12_000;

export class ImagenInvalidaError extends Error {
  constructor(message = "El archivo no es una imagen válida (JPG, PNG o WEBP).") {
    super(message);
    this.name = "ImagenInvalidaError";
  }
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<import("sharp").Metadata>} metadata si el archivo es válido
 * @throws {ImagenInvalidaError} con un mensaje apto para mostrarle al usuario
 */
export async function assertImagenValida(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImagenInvalidaError();
  }

  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELES }).metadata();
  } catch {
    // No se propaga el error de libvips: su mensaje identifica el decodificador
    // y la versión, justo lo que le sirve a alguien que quiera atacarlo.
    throw new ImagenInvalidaError();
  }

  if (!meta?.format || !FORMATOS_PERMITIDOS.has(meta.format)) {
    throw new ImagenInvalidaError();
  }
  if (!meta.width || !meta.height) {
    throw new ImagenInvalidaError();
  }
  if (meta.width > MAX_LADO || meta.height > MAX_LADO) {
    throw new ImagenInvalidaError("La imagen es demasiado grande. Máximo 12000×12000 px.");
  }
  if (meta.width * meta.height > MAX_PIXELES) {
    throw new ImagenInvalidaError("La imagen tiene demasiados píxeles.");
  }

  return meta;
}

/** Opciones a pasarle a sharp() en el pipeline, para acotar el trabajo del decoder. */
export const SHARP_OPTS = { limitInputPixels: MAX_PIXELES };
