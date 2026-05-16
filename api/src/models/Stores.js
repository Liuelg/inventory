const mongoose = require('mongoose');

const StoreItemSchema = new mongoose.Schema({
  item_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product', 
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

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [StoreItemSchema]
});

module.exports = mongoose.model('Store', storeSchema);