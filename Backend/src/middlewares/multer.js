import multer from "multer";

/**
 * Marca el error del fileFilter para que el manejador de la ruta lo devuelva
 * como 400 con su mensaje. Sin la marca cae en el handler genérico de app.js y
 * el usuario ve "Error interno del servidor" sin saber qué archivo mandar.
 */
function archivoInvalido(mensaje) {
  const e = new Error(mensaje);
  e.esArchivoInvalido = true;
  return e;
}

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(archivoInvalido("Solo se permiten imágenes JPG, PNG o WEBP"), false);
  }
};

/**
 * La matrícula también acepta PDF: es un documento y la mayoría de los técnicos
 * la tienen escaneada, no fotografiada. No se mezcla con imageFilter porque las
 * fotos de producto sí tienen que ser imágenes (se procesan con sharp).
 */
const matriculaFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(archivoInvalido("Subí una foto (JPG, PNG o WEBP) o la matrícula en PDF"), false);
  }
};

const excelFilter = (req, file, cb) => {
  const allowed = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel",                                           // .xls
    "text/csv",
    "application/csv",
    "application/octet-stream", // algunos navegadores envían esto para .xlsx
  ];
  const ext = file.originalname?.split(".").pop()?.toLowerCase();
  if (allowed.includes(file.mimetype) || ["xlsx", "xls", "csv"].includes(ext)) {
    cb(null, true);
  } else {
    cb(archivoInvalido("Solo se permiten archivos Excel (.xlsx, .xls) o CSV"), false);
  }
};

const uploadCloud = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadMatricula = multer({
  storage,
  fileFilter: matriculaFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadExcel = multer({
  storage,
  fileFilter: excelFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export default uploadCloud;
