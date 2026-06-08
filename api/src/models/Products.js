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

productSchema.index({ category: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ name: 1 });
productSchema.index({ tags: 1 });

export default model('Products', productSchema);
