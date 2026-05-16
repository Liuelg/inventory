const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  good: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Good', 
    required: true 
  },
  quantity: { type: Number, required: true },
  origin: { type: String, required: true },       // Source location
  destination: { type: String, required: true },  // Target location
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }, // The worker handling the move
  status: { 
    type: String, 
    enum: ['pending', 'in-transit', 'completed', 'cancelled'], 
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Transfer', transferSchema);