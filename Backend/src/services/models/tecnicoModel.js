import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    desc:  { type: String, trim: true, default: "" },
    icon:  { type: String, trim: true, default: "Wrench" },
  },
  { _id: false }
);

const tecnicoSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    title:           { type: String, trim: true, default: "" },
    photo:           { type: String, default: null },
    zone:            { type: String, required: true, trim: true },
    city:            { type: String, trim: true, default: "" },
    neighborhood:    { type: String, trim: true, default: "" },
    specialties:     [{ type: String, trim: true }],
    bio:             { type: String, trim: true, default: "" },
    services:        [serviceSchema],
    yearsExperience: { type: Number, default: 0, min: 0 },
    rating:          { type: Number, default: 5, min: 0, max: 5 },
    reviewCount:     { type: Number, default: 0, min: 0 },
    whatsapp:        { type: String, trim: true, default: "" },
    recentWork:      [{ type: String }],
    recommended:     { type: Boolean, default: false },
    active:          { type: Boolean, default: true },
    order:           { type: Number, default: 0 },
  },
  { timestamps: true }
);

tecnicoSchema.index({ zone: 1, active: 1 });
tecnicoSchema.index({ specialties: 1, active: 1 });
tecnicoSchema.index({ recommended: 1, active: 1 });
tecnicoSchema.index({ order: 1, recommended: -1 });

export default mongoose.model("Tecnico", tecnicoSchema);
