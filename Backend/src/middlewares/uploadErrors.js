import multer from "multer";

/**
 * Convierte los errores de subida en respuestas 400 con un mensaje útil.
 *
 * Va INMEDIATAMENTE DESPUÉS del middleware de multer en la ruta. Al tener cuatro
 * argumentos, Express lo saltea cuando la subida sale bien y solo lo llama si
 * falla.
 *
 * Sin esto, el error del fileFilter (o el de tamaño) llegaba al manejador
 * genérico de app.js y el usuario recibía un 500 "Error interno del servidor":
 * un técnico que subía la matrícula en PDF no tenía forma de saber que el
 * problema era el formato del archivo.
 */
export const manejarErrorDeArchivo = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "El archivo es demasiado grande. El máximo son 10 MB.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Se envió un archivo inesperado." });
    }
    return res.status(400).json({ message: "No se pudo subir el archivo. Probá de nuevo." });
  }

  // Los que marca el fileFilter de multer.js ya traen un mensaje para mostrar.
  if (err?.esArchivoInvalido) {
    return res.status(400).json({ message: err.message });
  }

  next(err);
};
