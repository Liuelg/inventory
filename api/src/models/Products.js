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
  prices: [{
    amount: Number,
    currency: { type: String, default: 'USD' }
  }],
  previous_prices: Number,
  tags: [String],
  image: String,
  code: { type: String, unique: true, sparse: true },
  pedsItemId: { type: String, unique: true, sparse: true },
  taxType: { type: Number, default: 4 }, // 1 = Taxable, 4 = NonTaxable
});

productSchema.index({ category: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ name: 1 });
productSchema.index({ name: "text" });
productSchema.index({ tags: 1 });

export default model('Products', productSchema);
