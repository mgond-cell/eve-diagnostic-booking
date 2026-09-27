const mongoose = require("mongoose");

const diagnosticTestSchema = new mongoose.Schema(
  {
    centre: { type: mongoose.Schema.Types.ObjectId, ref: "DiagnosticCentre", required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DiagnosticTest", diagnosticTestSchema);