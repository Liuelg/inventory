const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtSale: { type: Number, required: true } // Price locked in at time of purchase
  }],
  totalAmount: { type: Number, required: true },
  customerName: { type: String, required: true },
  processedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, // The staff member who ran the sale
  invoiceNumber: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);