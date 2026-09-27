const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const WebhookEvent = require("../models/WebhookEvent");


exports.simulatePayment = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id || !mongoose.Types.ObjectId.isValid(booking_id)) {
      return res.status(400).json({ message: "Valid booking_id is required" });
    }

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to pay for this booking" });
    }

    if (booking.status === "CONFIRMED") {
      return res.status(400).json({ message: "Booking is already confirmed and paid" });
    }

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ message: "Cannot pay for a cancelled booking" });
    }

    // Simulate payment gateway processing (random outcome)
    const isSuccess = Math.random() > 0.3; // ~70% success rate
    const providerPaymentId = `sim_pay_${crypto.randomUUID()}`;

    const payment = await Payment.create({
      booking: booking._id,
      amount: booking.amount,
      status: isSuccess ? "SUCCESS" : "FAILED",
      providerPaymentId,
    });

    booking.status = isSuccess ? "CONFIRMED" : "FAILED";
    await booking.save();

    res.status(201).json({
      payment,
      booking,
      message: isSuccess ? "Payment successful" : "Payment failed",
    });
  } catch (err) {
    res.status(500).json({ message: "Payment simulation failed", error: err.message });
  }
};


exports.handleWebhook = async (req, res) => {
  const { event_id, provider_payment_id, booking_id, status } = req.body;

  if (!event_id || !provider_payment_id || !booking_id || !status) {
    return res.status(400).json({
      message: "event_id, provider_payment_id, booking_id and status are required",
    });
  }

  if (!["SUCCESS", "FAILED"].includes(status)) {
    return res.status(400).json({ message: "status must be SUCCESS or FAILED" });
  }

  if (!mongoose.Types.ObjectId.isValid(booking_id)) {
    return res.status(400).json({ message: "Invalid booking_id" });
  }

  try {
    // Step 1: Try to record this event. Unique index does the heavy lifting.
    await WebhookEvent.create({
      eventId: event_id,
      payload: req.body,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate event — already processed. Idempotent no-op.
      return res.status(200).json({ message: "Event already processed, no action taken" });
    }
    return res.status(500).json({ message: "Failed to log webhook event", error: err.message });
  }

  try {
    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this webhook" });
    }

    // Idempotent business update: don't re-process a booking already in a final state
    if (booking.status === "CONFIRMED" || booking.status === "FAILED") {
      return res.status(200).json({
        message: "Booking already in a final state, webhook acknowledged",
        booking,
      });
    }

    // Avoid duplicate Payment docs for the same provider_payment_id
    let payment = await Payment.findOne({ providerPaymentId: provider_payment_id });
    if (!payment) {
      payment = await Payment.create({
        booking: booking._id,
        amount: booking.amount,
        status,
        providerPaymentId: provider_payment_id,
      });
    }

    booking.status = status === "SUCCESS" ? "CONFIRMED" : "FAILED";
    await booking.save();

    // Mark event as processed
    await WebhookEvent.updateOne({ eventId: event_id }, { processed: true });

    res.status(200).json({ message: "Webhook processed", booking, payment });
  } catch (err) {
    res.status(500).json({ message: "Failed to process webhook", error: err.message });
  }
};