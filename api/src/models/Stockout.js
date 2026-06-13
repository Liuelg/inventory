import { Schema, model } from 'mongoose'

export const StockoutItemSchema = new Schema({
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
  group: {
    type: Schema.Types.ObjectId,
    ref: 'ProductGroup',
    default: null
  }
}, { _id: false })

const stockoutSchema = new Schema({
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: [StockoutItemSchema],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  accepted_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  accepted_at: {
    type: Date,
    default: null
  },
  note: {
    type: String
  }
}, { timestamps: true })

stockoutSchema.index({ store: 1 })
stockoutSchema.index({ status: 1 })
stockoutSchema.index({ store: 1, status: 1 })
stockoutSchema.index({ createdAt: -1 })

export default model('Stockout', stockoutSchema)
