import { Schema, model } from "mongoose"

const StoreItemSchema = Schema({
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
  }
})

const storeSchema = Schema({
  name: { type: String, required: true },
  address: {type: String, required: true},
  manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [StoreItemSchema]
});

export default model('Store', storeSchema);