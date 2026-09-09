import serviceUserModel from "../services/models/serviceUserModel.js";
import { sendMail, approvalEmail, rejectionEmail } from "../services/emailService.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadPrivateToR2, getFromR2 } from "../utils/r2.js";
import { assertImagenValida, ImagenInvalidaError, SHARP_OPTS } from "../utils/imageGuard.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;
const MAX = { name: 120, company: 120, province: 80, phone: 30 };

/** Todos los campos de texto tienen que ser strings: un objeto acá termina en la query. */
const esTexto = (v) => v === undefined || v === null || typeof v === "string";

export const registerServiceUser = async (req, res) => {
  try {
    const { name, email, password, company, cuit, province, phone } = req.body;

    // Sin esto, un objeto tipo {"$ne": null} llega a findOne y a los campos del
    // documento. Express 5 protege el query string, pero NO el body.
    if (![name, email, password, company, cuit, province, phone].every(esTexto)) {
      return res.status(400).json({ message: "Datos inválidos." });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y contraseña son requeridos" });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ message: "El email no tiene un formato válido" });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({
        message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`,
      });
    }
    if (!cuit) {
      return res.status(400).json({ message: "El CUIT es requerido" });
    }
    const cuitLimpio = cuit.replace(/\D/g, "");
    if (cuitLimpio.length !== 11) {
      return res.status(400).json({ message: "El CUIT debe tener 11 dígitos" });
    }
    for (const [campo, tope] of Object.entries(MAX)) {
      if (req.body[campo] && req.body[campo].length > tope) {
        return res.status(400).json({ message: `El campo ${campo} es demasiado largo` });
      }
    }

    const emailNorm = email.toLowerCase().trim();

    // Respuesta genérica a propósito: decir "ya existe una cuenta con ese email"
    // confirma qué direcciones están registradas.
    const exists = await serviceUserModel.findOne({ email: emailNorm });
    if (exists) {
      return res.status(201).json({
        message: "Registro recibido. Si corresponde, vas a recibir la confirmación por email.",
      });
    }

    let matriculaKey = "";
    if (req.file?.buffer) {
      // Se valida que sea una imagen DE VERDAD antes de tocar libvips: el filtro
      // de multer solo mira el Content-Type que declara el cliente.
      await assertImagenValida(req.file.buffer);
      const buffer = await sharp(req.file.buffer, SHARP_OPTS)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      // Privada: es un documento personal. Se guarda la key, no una URL pública,
      // y se sirve por el endpoint de admin de más abajo.
      matriculaKey = await uploadPrivateToR2(
        buffer,
        `serviceuser-matriculas/${uuidv4()}.webp`,
        "image/webp"
      );
    }

    const user = new serviceUserModel({
      name, email: emailNorm, password, company,
      cuit: cuitLimpio, matriculaKey, province, phone,
    });
    await user.save();

    res.status(201).json({
      message: "Registro recibido. Si corresponde, vas a recibir la confirmación por email.",
    });
  } catch (error) {
    if (error instanceof ImagenInvalidaError) {
      return res.status(400).json({ message: error.message });
    }
    // No se devuelve error.message: acá el mensaje crudo de libvips le diría a un
    // atacante qué decodificador y versión tiene enfrente.
    console.error("Error al registrar service user:", error);
    res.status(500).json({ message: "No se pudo completar el registro. Intentá de nuevo." });
  }
};

/**
 * Sirve la imagen de matrícula al admin. Es un documento personal (Ley 25.326):
 * antes se guardaba la URL pública del bucket, accesible sin autenticación,
 * cacheada un año y sin forma de revocarla.
 */
export const getMatricula = async (req, res) => {
  try {
    const user = await serviceUserModel
      .findById(req.params.id)
      .select("matriculaKey matriculaImage")
      .lean();
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!user.matriculaKey) {
      // Registros viejos: la imagen quedó como URL pública en el bucket.
      if (user.matriculaImage) return res.redirect(user.matriculaImage);
      return res.status(404).json({ message: "Sin matrícula cargada" });
    }

    const obj = await getFromR2(user.matriculaKey);
    if (!obj) return res.status(404).json({ message: "Sin matrícula cargada" });

    res.set("Content-Type", obj.contentType);
    res.set("Cache-Control", "private, no-store");
    obj.body.pipe(res);
  } catch (error) {
    console.error("Error obteniendo matrícula:", error);
    res.status(500).json({ message: "No se pudo obtener la imagen" });
  }
};

export const listServiceUsers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};
    const users = await serviceUserModel
      .find(filter)
      .select("-password")
      .select("+matriculaKey")
      .sort({ createdAt: -1 })
      .lean();
    // No se manda la key ni la URL: solo si hay imagen. El panel la pide por
    // GET /api/users/:id/matricula, que va autenticado.
    res.json(
      users.map(({ matriculaKey, matriculaImage, ...u }) => ({
        ...u,
        hasMatricula: Boolean(matriculaKey || matriculaImage),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al listar usuarios"});
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
    if (status === "rejected" && !rejectionReason?.trim()) {
      return res.status(400).json({ message: "El motivo del rechazo es requerido" });
    }

    const update = { status, approved: status === "approved" };
    if (status === "approved") update.clientNumber = clientNumber.trim();
    if (status === "rejected") update.rejectionReason = rejectionReason.trim();

    const user = await serviceUserModel
      .findByIdAndUpdate(id, update, { new: true })
      .select("-password");

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    let emailResult = null;
    if (status === "approved") {
      const mail = approvalEmail(user.name, clientNumber.trim());
      emailResult = await sendMail({ to: user.email, ...mail });
    } else if (status === "rejected") {
      const mail = rejectionEmail(user.name, rejectionReason);
      emailResult = await sendMail({ to: user.email, ...mail });
    }

    res.json({ ...user.toObject(), emailSent: emailResult?.ok ?? null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar estado"});
  }
};
