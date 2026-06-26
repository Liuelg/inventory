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
  },
  currency: {
    type: String,
    default: 'USD'
  }
})

const saleSchema = Schema({
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  customerName: { type: String},
  salesName: { type: String },
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

saleSchema.index({ store: 1 })
saleSchema.index({ date_time: -1 })
saleSchema.index({ store: 1, date_time: -1 })
saleSchema.index({ invoiceNumber: 1 })

export default model('Sale', saleSchema);