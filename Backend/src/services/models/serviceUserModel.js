import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const serviceUserSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:        { type: String, required: true },
    company:         { type: String, default: "" },
    matricula:       { type: String, default: "" },
    province:        { type: String, default: "" },
    phone:           { type: String, default: "" },
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
