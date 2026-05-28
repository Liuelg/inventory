import { Schema, model } from "mongoose"

const invoiceCounterSchema = new Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: "Store",
    required: true,
    unique: true,
  },
  sequence: {
    type: Number,
    default: 0,
    min: 0,
  },
})

export default model("InvoiceCounter", invoiceCounterSchema)
