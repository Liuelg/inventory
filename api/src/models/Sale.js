const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  item_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product', 
    required: true
  },
  quantity: { 
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
})

const saleSchema = new mongoose.Schema({
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  customerName: { type: String},
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store', 
    required: true
  },
  processedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, 
  date_time: {
    type: Date,
    required: true,
    default: Date.now // Automatically logs the exact time the sale document is created
  },
  invoiceNumber: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);