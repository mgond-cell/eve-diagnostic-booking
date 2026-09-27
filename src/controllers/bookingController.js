const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const DiagnosticTest = require("../models/DiagnosticTest");
const DiagnosticCentre = require("../models/DiagnosticCentre");

exports.createBooking = async (req, res) => {
  try {
    const { test_id, centre_id, appointment_datetime } = req.body;

    if (!test_id || !centre_id || !appointment_datetime) {
      return res.status(400).json({
        message: "test_id, centre_id and appointment_datetime are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(test_id) || !mongoose.Types.ObjectId.isValid(centre_id)) {
      return res.status(400).json({ message: "Invalid test_id or centre_id" });
    }

    const appointmentDate = new Date(appointment_datetime);
    if (isNaN(appointmentDate.getTime()) || appointmentDate < new Date()) {
      return res.status(400).json({ message: "appointment_datetime must be a valid future date" });
    }

    const test = await DiagnosticTest.findById(test_id);
    if (!test) {
      return res.status(404).json({ message: "Diagnostic test not found" });
    }

    const centre = await DiagnosticCentre.findById(centre_id);
    if (!centre) {
      return res.status(404).json({ message: "Diagnostic centre not found" });
    }

    // Ensure the test actually belongs to the given centre
    if (test.centre.toString() !== centre_id) {
      return res.status(400).json({ message: "This test is not offered at the given centre" });
    }

    const booking = await Booking.create({
      user: req.user._id,
      test: test._id,
      centre: centre._id,
      appointmentDateTime: appointmentDate,
      amount: test.price,
      status: "PENDING",
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to create booking", error: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("test", "name price")
      .populate("centre", "name location")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(req.params.id)
      .populate("test", "name price")
      .populate("centre", "name location");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Authorization check: users can only view their own bookings
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch booking", error: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this booking" });
    }

    if (booking.status === "CONFIRMED") {
      return res.status(400).json({ message: "Cannot cancel a confirmed booking" });
    }

    booking.status = "CANCELLED";
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel booking", error: err.message });
  }
};