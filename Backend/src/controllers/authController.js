import userModel from "../services/models/userModel.js";
import serviceUserModel from "../services/models/serviceUserModel.js";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

const JWT_SECRET = config.jwtSecret;

export const registerAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const userExists = await userModel.findOne({ username });
    if (userExists)
      return res.status(400).json({ message: "Usuario ya existe" });

    const user = new userModel({ username, password });
    await user.save();

    res.status(201).json({ message: "Admin creado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error creando admin", error });
  }
};

export const login = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // ── Login de usuario service (por email) ─────────────────
    if (email) {
      const user = await serviceUserModel.findOne({ email: email.toLowerCase().trim() });
      if (!user)
        return res.status(401).json({ message: "Credenciales inválidas" });

      const isMatch = await user.comparePassword(password);
      if (!isMatch)
        return res.status(401).json({ message: "Credenciales inválidas" });

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
    if (!user)
      return res.status(401).json({ message: "Credenciales inválidas" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Credenciales inválidas" });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: "admin" });
  } catch (error) {
    res.status(500).json({ message: "Error en login", error });
  }
};
