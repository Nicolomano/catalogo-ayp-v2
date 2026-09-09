import rateLimit from "express-rate-limit";

/**
 * Límites por IP para los endpoints públicos que se pueden abusar.
 * Antes no había ninguno: el login aceptaba intentos ilimitados y, como cada
 * intento corre bcrypt (~100 ms de CPU), además servía para tirar la API a
 * pedidos concurrentes sin siquiera adivinar una contraseña.
 */

const comun = {
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
};

/**
 * Techo general para toda la API. Los límites específicos de abajo siguen
 * aplicando encima de este.
 *
 * Existe sobre todo por el buscador: `GET /products?search=` hace un $regex no
 * anclado que ningún índice cubre, dos veces por request (find + countDocuments),
 * sobre ~3200 productos. Sin techo, unas pocas decenas de conexiones saturan el
 * proceso. El valor es holgado para no molestar a un cliente navegando.
 */
export const apiLimiter = rateLimit({
  ...comun,
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Demasiadas solicitudes. Esperá unos minutos." },
});

/** Login: fuerza bruta. Los intentos exitosos no cuentan. */
export const loginLimiter = rateLimit({
  ...comun,
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    message: "Demasiados intentos de inicio de sesión. Probá de nuevo en 15 minutos.",
  },
});

/** Registro: crea documentos en Mongo y sube imágenes de matrícula a R2. */
export const registerLimiter = rateLimit({
  ...comun,
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    message: "Demasiados registros desde esta conexión. Probá de nuevo en una hora.",
  },
});

/** Pedidos: endpoint público que escribe en la base e infla soldCount. */
export const orderLimiter = rateLimit({
  ...comun,
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    message: "Demasiados pedidos seguidos. Escribinos por WhatsApp si necesitás ayuda.",
  },
});
