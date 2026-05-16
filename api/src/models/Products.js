const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  price: {
    amount: Number,
    currency: { type: String, default: 'USD' }
  },
  previous_prices: Number,
  tags: [String],
  image: String
});

module.exports = mongoose.model('Product', productSchema);