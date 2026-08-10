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
  eur: { type: Number, default: 0, min: 0 },
  usd: { type: Number, default: 0, min: 0 },
  birr: { type: Number, default: 0, min: 0 },
  visa: { type: Number, default: 0, min: 0 },
  gbp: { type: Number, default: 0, min: 0 },
  image: { type: String },
  pedsItemIdentifierId: { type: String },
})

const saleSchema = Schema({
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  rates: {
    eur: { type: Number, default: 1 },
    usd: { type: Number, default: 1 },
    birr: { type: Number, default: 1 },
    visa: { type: Number, default: 1 },
    gbp: { type: Number, default: 1 },
  },
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
  }, 
  date_time: {
    type: Date,
    required: true,
    default: Date.now // Automatically logs the exact time the sale document is created
  },
  invoiceNumber: { type: String, required: true, unique: true },
  pedsInvoiceNo: { type: String },
  pedsFsInvoiceNo: { type: String },
  pedsGuid: { type: String },
  pedsStatus: {
    type: String,
    enum: ['not_paid', 'fully_paid', 'partially_paid', 'voided'],
  },
  pedsMachineId: { type: String },
  source: { type: String, enum: ['ims', 'peds'], default: 'ims' },
  unresolvedPedsItems: { type: [Schema.Types.Mixed], default: [] },
}, { timestamps: true });

saleSchema.index({ store: 1 })
saleSchema.index({ date_time: -1 })
saleSchema.index({ store: 1, date_time: -1 })
saleSchema.index({ invoiceNumber: 1 })
saleSchema.index({ pedsInvoiceNo: 1 })
saleSchema.index({ source: 1 })

export default model('Sale', saleSchema);