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
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'ProductGroup',
    default: null
  }
})

const storeSchema = Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  address: {type: String, required: true},
  manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [StoreItemSchema],
  pedsEnabled: { type: Boolean, default: false },
  pedsBaseUrl: { type: String, default: '' },
  pedsPosId: { type: String, default: '' },
  pedsMachineId: { type: String, default: '' },
  pedsUsername: { type: String, default: '' },
  pedsPassword: { type: String, default: '' },
});

export default model('Store', storeSchema);