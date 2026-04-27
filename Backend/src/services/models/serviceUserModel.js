import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const serviceUserSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:        { type: String, required: true },
    company:         { type: String, default: "" },
    cuit:            { type: String, required: true },
    matriculaImage:  { type: String, default: "" }, // R2 public URL
    province:        { type: String, default: "" },
    phone:           { type: String, default: "" },
    clientNumber:    { type: String, default: "" }, // assigned by admin before approval
    role:            { type: String, default: "service" },
    approved:        { type: Boolean, default: false },
    status:          { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

serviceUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

serviceUserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("ServiceUser", serviceUserSchema);
