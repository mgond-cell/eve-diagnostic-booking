const express = require("express");
const router = express.Router();
const {
  createCentre,
  getCentres,
  getCentreById,
  addTestToCentre,
} = require("../controllers/centreController");
const { protect } = require("../middleware/auth");

// Public: anyone can browse centres and tests
router.get("/", getCentres);
router.get("/:id", getCentreById);

// Protected (admin-like action) — for assignment scope, any logged-in user can add
router.post("/", protect, createCentre);
router.post("/:id/tests", protect, addTestToCentre);

module.exports = router;