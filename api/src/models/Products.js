import { Schema, model } from "mongoose"

const productSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
  price: {
    amount: Number,
    currency: { type: String, default: 'USD' }
  },
  previous_prices: Number,
  tags: [String],
  image: String,
});

export default model('Products', productSchema);