const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  farmerId: { type: String, required: true },
  farmerEmail: { type: String, required: true },
  farmerName: { type: String, default: "Unknown Farmer" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  response: { type: String, default: "" },
  resolutionNotes: { type: String, default: "" }
}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', complaintSchema);