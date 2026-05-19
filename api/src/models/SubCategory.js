import { Schema, model } from 'mongoose';

const subCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  },
  { timestamps: true }
);

export default model('SubCategory', subCategorySchema);
