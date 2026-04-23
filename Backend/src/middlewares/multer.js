import multer from "multer";

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"), false);
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
    cb(new Error("Solo se permiten archivos Excel (.xlsx, .xls) o CSV"), false);
  }
};

const uploadCloud = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadExcel = multer({
  storage,
  fileFilter: excelFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export default uploadCloud;
