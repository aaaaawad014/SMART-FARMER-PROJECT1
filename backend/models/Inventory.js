const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    category: { type: String, default: "General" },
    availableQty: { type: Number, default: 0 },
    unit: { type: String, default: "kg" },
    price: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", InventorySchema);
