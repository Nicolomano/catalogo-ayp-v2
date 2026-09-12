import bcrypt from "bcryptjs";
import crypto from "crypto";
import userModel from "../services/models/userModel.js";
import serviceUserModel from "../services/models/serviceUserModel.js";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { sendMail, passwordResetEmail } from "../services/emailService.js";

const JWT_SECRET = config.jwtSecret;

// Hash descartable con el mismo costo que los reales. Se compara contra él
// cuando el usuario NO existe, para que la respuesta tarde lo mismo: sin esto,
// "email inexistente" respondía en ~5ms y "email correcto, clave mal" en ~130ms,
// una diferencia de 20x que permite averiguar qué cuentas existen.
const DUMMY_HASH = bcrypt.hashSync("contraseña-que-nadie-usa", 11);

const esTexto = (v) => typeof v === "string";

const SITE_URL = (process.env.FRONTEND_URL || "https://www.refrigeracionayp.com").replace(/\/$/, "");
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora
const MIN_PASSWORD = 8;

/** Guardamos el hash del token, no el token: una filtración de la base no sirve para resetear. */
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

const MIN_PASS_ADMIN = 12;
const NIVELES = ["total", "limitado"];

const aVista = (u) => ({
  _id: u._id,
  username: u.username,
  nivel: u.nivel || "total",
  createdAt: u.createdAt,
});

export const registerAdmin = async (req, res) => {
  try {
    const { username, password, nivel = "limitado" } = req.body;
    if (!esTexto(username) || !esTexto(password) || !esTexto(nivel)) {
      return res.status(400).json({ message: "Datos inválidos." });
    }
    if (!username.trim()) {
      return res.status(400).json({ message: "El nombre de usuario es requerido" });
    }
    if (!NIVELES.includes(nivel)) {
      return res.status(400).json({ message: "Nivel de acceso inválido" });
    }
    if (password.length < MIN_PASS_ADMIN) {
      return res.status(400).json({
        message: `La contraseña de administrador debe tener al menos ${MIN_PASS_ADMIN} caracteres`,
      });
    }

    const userExists = await userModel.findOne({ username: username.trim() });
    if (userExists)
      return res.status(400).json({ message: "Ya existe un administrador con ese usuario" });

    const user = new userModel({ username: username.trim(), password, nivel });
    await user.save();

    res.status(201).json(aVista(user));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Ya existe un administrador con ese usuario" });
    }
    console.error("Error creando admin:", error);
    res.status(500).json({ message: "No se pudo crear el administrador" });
  }
};

/** Lista de administradores. Nunca devuelve contraseñas. */
export const listAdmins = async (req, res) => {
  try {
    const admins = await userModel.find().select("username nivel createdAt").sort({ createdAt: 1 }).lean();
    res.json(admins.map(aVista));
  } catch (error) {
    console.error("Error listando admins:", error);
    res.status(500).json({ message: "No se pudieron obtener los administradores" });
  }
};

/** Cambia el nivel o la contraseña de otro administrador. */
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nivel, password } = req.body;

    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ message: "Administrador no encontrado" });

    if (nivel !== undefined) {
      if (!esTexto(nivel) || !NIVELES.includes(nivel)) {
        return res.status(400).json({ message: "Nivel de acceso inválido" });
      }
      // Sin esto, el único admin con acceso total podría degradarse a sí mismo y
      // dejar el sistema sin nadie que pueda importar ni crear usuarios.
      if ((user.nivel || "total") === "total" && nivel !== "total") {
        const totales = await userModel.countDocuments({ nivel: "total" });
        if (totales <= 1) {
          return res.status(400).json({
            message: "Tiene que quedar al menos un administrador con acceso total.",
          });
        }
      }
      user.nivel = nivel;
    }

    if (password !== undefined) {
      if (!esTexto(password) || password.length < MIN_PASS_ADMIN) {
        return res.status(400).json({
          message: `La contraseña debe tener al menos ${MIN_PASS_ADMIN} caracteres`,
        });
      }
      // Asignar y save(): el hook hashea y sube tokenVersion, cerrando las
      // sesiones abiertas de esa persona.
      user.password = password;
    }

    await user.save();
    res.json(aVista(user));
  } catch (error) {
    console.error("Error actualizando admin:", error);
    res.status(500).json({ message: "No se pudo actualizar el administrador" });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id) === String(req.user.id)) {
      return res.status(400).json({ message: "No podés eliminar tu propia cuenta." });
    }

    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ message: "Administrador no encontrado" });

    if ((user.nivel || "total") === "total") {
      const totales = await userModel.countDocuments({ nivel: "total" });
      if (totales <= 1) {
        return res.status(400).json({
          message: "Tiene que quedar al menos un administrador con acceso total.",
        });
      }
    }

    await user.deleteOne();
    res.json({ message: "Administrador eliminado" });
  } catch (error) {
    console.error("Error eliminando admin:", error);
    res.status(500).json({ message: "No se pudo eliminar el administrador" });
  }
};

/** Cambiar la contraseña propia. Disponible para cualquier administrador. */
export const cambiarMiPassword = async (req, res) => {
  try {
    const { actual, nueva } = req.body;
    if (!esTexto(actual) || !esTexto(nueva)) {
      return res.status(400).json({ message: "Datos inválidos." });
    }
    if (nueva.length < MIN_PASS_ADMIN) {
      return res.status(400).json({
        message: `La contraseña nueva debe tener al menos ${MIN_PASS_ADMIN} caracteres`,
      });
    }

    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Se pide la actual para que alguien que agarre una sesión abierta no pueda
    // apropiarse de la cuenta.
    if (!(await user.comparePassword(actual))) {
      return res.status(400).json({ message: "La contraseña actual no es correcta" });
    }

    user.password = nueva;
    await user.save();

    // Al guardar sube tokenVersion, así que la sesión actual también queda
    // invalidada: hay que volver a entrar.
    res.json({ message: "Contraseña actualizada. Volvé a iniciar sesión." });
  } catch (error) {
    console.error("Error cambiando contraseña:", error);
    res.status(500).json({ message: "No se pudo cambiar la contraseña" });
  }
};

export const login = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Los operadores de Mongo llegan por el BODY (Express 5 ya protege el query
    // string). Sin este chequeo, {"username":{"$regex":"^a"}} matcheaba un admin
    // y la diferencia entre 500 y 401 servía para adivinar el usuario letra a letra.
    if (!esTexto(password) || (email !== undefined && !esTexto(email)) ||
        (username !== undefined && !esTexto(username))) {
      return res.status(400).json({ message: "Datos inválidos." });
    }

    // ── Login de usuario service (por email) ─────────────────
    if (email) {
      const user = await serviceUserModel.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH); // iguala el tiempo de respuesta
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch)
        return res.status(401).json({ message: "Credenciales inválidas" });

      // La aprobación se valida ACÁ, antes de firmar. Antes se devolvía un token
      // válido igual y el "esperá la aprobación" vivía solo en el navegador: una
      // cuenta sin aprobar podía operar la API con ese token.
      if (!user.approved) {
        return res.status(403).json({
          message:
            "Tu cuenta aún no fue aprobada. Por favor esperá la confirmación del administrador.",
          approved: false,
          status: user.status,
          pending: true,
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: "service",
          approved: user.approved,
          tv: user.tokenVersion || 0, // se invalida al cambiar la clave o el email
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        role: "service",
        approved: user.approved,
        name: user.name,
        status: user.status,
      });
    }

    // ── Login de admin (por username) ─────────────────────────
    const user = await userModel.findOne({ username });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Credenciales inválidas" });

    // Las cuentas creadas antes de que existieran los niveles no tienen el campo:
    // se tratan como total, que es lo que eran. app.js las migra al arrancar.
    const nivel = user.nivel || "total";

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: "admin",
        nivel,
        tv: user.tokenVersion || 0, // permite revocar sesiones al cambiar la clave
      },
      JWT_SECRET,
      { expiresIn: "2d" } // más corto que el de service: es la credencial más sensible
    );

    res.json({ token, role: "admin", nivel });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "No se pudo iniciar sesión" });
  }
};

/**
 * Pide el mail de recuperación. SIEMPRE responde lo mismo, exista o no la cuenta:
 * si respondiera distinto se convertiría en un detector de qué emails están
 * registrados.
 */
export const forgotPassword = async (req, res) => {
  const RESPUESTA = {
    message:
      "Si el email corresponde a una cuenta registrada, te enviamos las instrucciones para restablecer la contraseña.",
  };
  try {
    const { email } = req.body;
    if (!esTexto(email)) return res.status(400).json({ message: "Datos inválidos." });

    const user = await serviceUserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json(RESPUESTA);

    const token = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashToken(token);
    user.resetTokenExp = new Date(Date.now() + RESET_TTL_MS);
    // save() dispara el hook de bcrypt, pero solo si password fue modificada;
    // acá no lo es, así que no se re-hashea.
    await user.save();

    const url = `${SITE_URL}/restablecer-password?token=${token}`;
    const mail = passwordResetEmail(user.name, url);
    const enviado = await sendMail({ to: user.email, ...mail });
    if (!enviado.ok) {
      console.error("No se pudo enviar el mail de recuperación:", enviado.reason);
    }

    res.json(RESPUESTA);
  } catch (error) {
    console.error("Error en forgotPassword:", error);
    res.json(RESPUESTA); // tampoco acá se revela nada
  }
};

/** Cambia la contraseña con el token del mail. Un solo uso y con vencimiento. */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!esTexto(token) || !esTexto(password)) {
      return res.status(400).json({ message: "Datos inválidos." });
    }
    if (password.length < MIN_PASSWORD) {
      return res
        .status(400)
        .json({ message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    const user = await serviceUserModel
      .findOne({ resetTokenHash: hashToken(token), resetTokenExp: { $gt: new Date() } })
      .select("+resetTokenHash +resetTokenExp");

    if (!user) {
      return res.status(400).json({
        message: "El enlace no es válido o ya venció. Pedí uno nuevo.",
      });
    }

    // save() (no findByIdAndUpdate) para que corra el hook que hashea la clave.
    user.password = password;
    user.resetTokenHash = "";
    user.resetTokenExp = null;
    // Cierra las sesiones abiertas: si alguien tenía el token robado, deja de servirle.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ message: "Listo, ya podés iniciar sesión con tu contraseña nueva." });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    res.status(500).json({ message: "No se pudo restablecer la contraseña" });
  }
};
