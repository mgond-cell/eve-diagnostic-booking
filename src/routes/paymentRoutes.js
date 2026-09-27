const express = require("express");
const router = express.Router();
const { simulatePayment, handleWebhook } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.post("/", protect, simulatePayment);
router.post("/webhook", handleWebhook); 

module.exports = router;