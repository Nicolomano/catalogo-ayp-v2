import jwt from "jsonwebtoken";
import config from "../config/config.js";
import userModel from "../services/models/userModel.js";
const JWT_SECRET = config.jwtSecret;

/**
 * Autenticación: valida la firma del token y deja el payload en req.user.
 *
 * OJO: `protect` NO autoriza. Cualquier token válido pasa, incluido el de un
 * usuario service (el registro de service es público). Para todo lo que sea de
 * administración hay que encadenar `requireAdmin`.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ Verificar que haya token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado, falta token" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verificar validez del token (algoritmo fijado: no aceptamos "none"
    // ni que el atacante elija cómo se verifica la firma)
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

    // Los tokens de admin se contrastan contra la base para poder revocarlos:
    // al cambiar la contraseña sube tokenVersion y las sesiones viejas mueren.
    // Es una query extra, pero el tráfico de admin es mínimo.
    if (decoded.role === "admin") {
      const admin = await userModel.findById(decoded.id).select("tokenVersion").lean();
      if (!admin || (admin.tokenVersion || 0) !== (decoded.tv || 0)) {
        return res
          .status(401)
          .json({ message: "Sesión expirada, por favor inicia sesión nuevamente" });
      }
    }

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

// No hay un `requireApprovedService`: leería `approved` del token, que dura 7
// días, así que un técnico al que le revocaron la cuenta seguiría pasando. Lo
// que dependa del beneficio service usa `esServiceAprobado` de
// orderController.js, que relee el estado de la base en cada pedido.
