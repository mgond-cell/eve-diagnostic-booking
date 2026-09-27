const DiagnosticCentre = require("../models/DiagnosticCentre");
const DiagnosticTest = require("../models/DiagnosticTest");

exports.createCentre = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name || !location) {
      return res.status(400).json({ message: "Name and location are required" });
    }
    const centre = await DiagnosticCentre.create({ name, location });
    res.status(201).json(centre);
  } catch (err) {
    res.status(500).json({ message: "Failed to create centre", error: err.message });
  }
};

exports.getCentres = async (req, res) => {
  try {
    const centres = await DiagnosticCentre.find();
    // attach tests for each centre
    const results = await Promise.all(
      centres.map(async (centre) => {
        const tests = await DiagnosticTest.find({ centre: centre._id });
        return { ...centre.toObject(), tests };
      })
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch centres", error: err.message });
  }
};

exports.getCentreById = async (req, res) => {
  try {
    const centre = await DiagnosticCentre.findById(req.params.id);
    if (!centre) {
      return res.status(404).json({ message: "Centre not found" });
    }
    const tests = await DiagnosticTest.find({ centre: centre._id });
    res.json({ ...centre.toObject(), tests });
  } catch (err) {
    // Invalid ObjectId format also lands here
    res.status(400).json({ message: "Invalid centre ID", error: err.message });
  }
};

exports.addTestToCentre = async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price == null || price <= 0) {
      return res.status(400).json({ message: "Valid test name and price are required" });
    }

    const centre = await DiagnosticCentre.findById(req.params.id);
    if (!centre) {
      return res.status(404).json({ message: "Centre not found" });
    }

    const test = await DiagnosticTest.create({ centre: centre._id, name, price });
    res.status(201).json(test);
  } catch (err) {
    res.status(400).json({ message: "Failed to add test", error: err.message });
  }
};