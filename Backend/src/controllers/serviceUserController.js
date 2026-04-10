import serviceUserModel from "../services/models/serviceUserModel.js";

export const registerServiceUser = async (req, res) => {
  try {
    const { name, email, password, company, matricula, province, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y contraseña son requeridos" });
    }

    const exists = await serviceUserModel.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: "Ya existe una cuenta con ese email" });
    }

    const user = new serviceUserModel({ name, email, password, company, matricula, province, phone });
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
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const update = { status, approved: status === "approved" };
    if (status === "rejected" && rejectionReason) update.rejectionReason = rejectionReason;

    const user = await serviceUserModel
      .findByIdAndUpdate(id, update, { new: true })
      .select("-password");

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar estado", error: error.message });
  }
};
