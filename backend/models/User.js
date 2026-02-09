const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    email: { type: String, required: true },
    role: { type: String, enum: ["farmer", "admin"], default: "farmer" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
