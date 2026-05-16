const mongoose = require('mongoose');

const goodSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  sku: { type: String, required: true, unique: true }, // Stock Keeping Unit
  quantity: { type: Number, required: true, default: 0 },
  warehouseLocation: { type: String, required: true }, // e.g., "Aisle 4, Shelf B"
  status: { 
    type: String, 
    enum: ['in-stock', 'allocated', 'damaged', 'transit'], 
    default: 'in-stock' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Goodin', goodSchema);