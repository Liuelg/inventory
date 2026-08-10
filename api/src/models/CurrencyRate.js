import { Schema, model } from "mongoose"

const CurrencyRateSchema = new Schema({
  base: {
    type: String,
    required: true,
    default: "USD",
  },
  rates: {
    eur: { type: Number, required: true, default: 1 },
    usd: { type: Number, required: true, default: 1 },
    birr: { type: Number, required: true, default: 1 },
    visa: { type: Number, required: true, default: 1 },
    gbp: { type: Number, required: true, default: 1 },
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { timestamps: true })

// Ensure only one rate document per date
CurrencyRateSchema.index({ date: 1 }, { unique: true })

export default model("CurrencyRate", CurrencyRateSchema)
