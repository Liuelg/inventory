import { Schema, model } from "mongoose"

const SaleItemSchema = Schema({
  item_id: {
    type: Schema.Types.ObjectId,
    ref: 'Products', 
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

const saleSchema = Schema({
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  customerName: { type: String},
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store', 
    required: true
  },
  processedBy: { 
    type: Schema.Types.ObjectId, 
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

export default model('Sale', saleSchema);