const mongoose = require("mongoose");

const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "FAILED", "CANCELLED"];

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: "DiagnosticTest", required: true },
    centre: { type: mongoose.Schema.Types.ObjectId, ref: "DiagnosticCentre", required: true },
    appointmentDateTime: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: BOOKING_STATUSES, default: "PENDING" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;