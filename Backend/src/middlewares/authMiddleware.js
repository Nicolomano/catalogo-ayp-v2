import jwt from "jsonwebtoken";
import config from "../config/config.js";
const JWT_SECRET = config.jwtSecret;

/**
 * Autenticación: valida la firma del token y deja el payload en req.user.
 *
 * OJO: `protect` NO autoriza. Cualquier token válido pasa, incluido el de un
 * usuario service (el registro de service es público). Para todo lo que sea de
 * administración hay que encadenar `requireAdmin`.
 */
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ Verificar que haya token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado, falta token" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verificar validez del token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    console.error("❌ Error en autenticación:", error.message);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({
          message: "Sesión expirada, por favor inicia sesión nuevamente",
        });
    }

    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

/**
 * Autorización: exige rol admin. Va SIEMPRE después de `protect`.
 *
 * Sin esto, cualquiera que se registre como service (formulario público) obtiene
 * un token válido y puede operar todos los endpoints de administración.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acceso restringido a administradores" });
  }
  next();
};

/**
 * Autorización: exige un usuario service aprobado. Va después de `protect`.
 * Se usa para lo que dependa del beneficio de precio service.
 */
export const requireApprovedService = (req, res, next) => {
  if (req.user?.role !== "service" || req.user?.approved !== true) {
    return res.status(403).json({ message: "Cuenta service no aprobada" });
  }
  next();
};
