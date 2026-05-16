const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // This nested array tracks inventory specifically for this store
  items: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 0 },
    price: { 
        currency: { type: mongoose.Schema.Types.String },
        amount: { type: mongoose.Schema.Types.Number }
    }
  }]
});

module.exports = mongoose.model('Store', storeSchema);