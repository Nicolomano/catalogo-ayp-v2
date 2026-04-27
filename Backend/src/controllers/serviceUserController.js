import serviceUserModel from "../services/models/serviceUserModel.js";
import { sendMail, approvalEmail, rejectionEmail } from "../services/emailService.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadToR2 } from "../utils/r2.js";

export const registerServiceUser = async (req, res) => {
  try {
    const { name, email, password, company, cuit, province, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y contraseña son requeridos" });
    }
    if (!cuit) {
      return res.status(400).json({ message: "El CUIT es requerido" });
    }

    const exists = await serviceUserModel.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: "Ya existe una cuenta con ese email" });
    }

    let matriculaImage = "";
    if (req.file?.buffer) {
      const buffer = await sharp(req.file.buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      matriculaImage = await uploadToR2(
        buffer,
        `serviceuser-matriculas/${uuidv4()}.webp`,
        "image/webp"
      );
    }

    const user = new serviceUserModel({
      name, email, password, company, cuit, matriculaImage, province, phone,
    });
    await user.save();

    res.status(201).json({ message: "Registro exitoso. Tu cuenta está pendiente de aprobación." });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar", error: error.message });
  }
};

export const listServiceUsers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};
    const users = await serviceUserModel
      .find(filter)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error al listar usuarios", error: error.message });
  }
};

export const updateServiceUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, clientNumber } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    if (status === "approved" && !clientNumber?.trim()) {
      return res.status(400).json({ message: "Debés asignar un número de cliente antes de aprobar" });
    }

    const update = { status, approved: status === "approved" };
    if (status === "approved") update.clientNumber = clientNumber.trim();
    if (status === "rejected" && rejectionReason) update.rejectionReason = rejectionReason;

    const user = await serviceUserModel
      .findByIdAndUpdate(id, update, { new: true })
      .select("-password");

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (status === "approved") {
      const mail = approvalEmail(user.name, clientNumber.trim());
      sendMail({ to: user.email, ...mail });
    } else if (status === "rejected") {
      const mail = rejectionEmail(user.name, rejectionReason);
      sendMail({ to: user.email, ...mail });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar estado", error: error.message });
  }
};
