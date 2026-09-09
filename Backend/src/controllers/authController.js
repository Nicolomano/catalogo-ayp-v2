import bcrypt from "bcryptjs";
import userModel from "../services/models/userModel.js";
import serviceUserModel from "../services/models/serviceUserModel.js";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

const JWT_SECRET = config.jwtSecret;

// Hash descartable con el mismo costo que los reales. Se compara contra él
// cuando el usuario NO existe, para que la respuesta tarde lo mismo: sin esto,
// "email inexistente" respondía en ~5ms y "email correcto, clave mal" en ~130ms,
// una diferencia de 20x que permite averiguar qué cuentas existen.
const DUMMY_HASH = bcrypt.hashSync("contraseña-que-nadie-usa", 11);

const esTexto = (v) => typeof v === "string";

export const registerAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!esTexto(username) || !esTexto(password)) {
      return res.status(400).json({ message: "Datos inválidos." });
    }
    if (password.length < 12) {
      return res
        .status(400)
        .json({ message: "La contraseña de administrador debe tener al menos 12 caracteres" });
    }

    const userExists = await userModel.findOne({ username });
    if (userExists)
      return res.status(400).json({ message: "Usuario ya existe" });

    const user = new userModel({ username, password });
    await user.save();

    res.status(201).json({ message: "Admin creado correctamente" });
  } catch (error) {
    console.error("Error creando admin:", error);
    res.status(500).json({ message: "No se pudo crear el administrador" });
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
        { id: user._id, email: user.email, role: "service", approved: user.approved },
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

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: "admin",
        tv: user.tokenVersion || 0, // permite revocar sesiones al cambiar la clave
      },
      JWT_SECRET,
      { expiresIn: "2d" } // más corto que el de service: es la credencial más sensible
    );

    res.json({ token, role: "admin" });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "No se pudo iniciar sesión" });
  }
};
