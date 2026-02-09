const mongoose = require("mongoose");

const CropSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: true }, // firebase uid
    cropName: { type: String, required: true },
    season: { type: String, default: "" },
    area: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    status: { type: String, default: "Active" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", CropSchema);
