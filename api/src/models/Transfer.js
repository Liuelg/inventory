import mongoose, { Schema } from "mongoose";
import { GoodInItemSchema } from "./Goodin.js";

export const TransactionItemSchema = Schema({
  item_id: {
    type: Schema.Types.ObjectId,
    ref: 'Products',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

export const transferSchema = new Schema({
  items: [GoodInItemSchema],
  origin: { type: String, required: true },       
  destination: { type: String, required: true },  
  
}, { timestamps: true });

export default mongoose.model('Transfer', transferSchema);