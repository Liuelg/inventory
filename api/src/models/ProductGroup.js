import { Schema, model } from "mongoose"

const ProductGroupItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Products',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false })

const productGroupSchema = new Schema({
  name: { type: String, required: true },
  image: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
  items: [ProductGroupItemSchema]
}, { timestamps: true })

export default model('ProductGroup', productGroupSchema)
