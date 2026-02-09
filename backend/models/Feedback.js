const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: true },
    farmerEmail: { type: String, default: "" },
    farmerName: { type: String, default: "" },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", FeedbackSchema);