const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  price: {
    amount: Number,
    currency: { type: String, default: 'USD' }
  },
  description: String,
  previous_prices: Number,
  tags: [String],
  image: String,
  category: String
});

module.exports = mongoose.model('Product', productSchema);