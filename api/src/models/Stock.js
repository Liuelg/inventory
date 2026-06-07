import { Schema, model } from "mongoose"

export const StockItemSchema = new Schema({
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
  remaining: {
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

const stockSchema = new Schema({
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
  items: [StockItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  note: {
    type: String
  }
}, { timestamps: true })

export default model('Stock', stockSchema)
