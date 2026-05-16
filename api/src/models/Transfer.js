const mongoose = require('mongoose');

const TransactionItemSchema = new Schema({
  item_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const transferSchema = new mongoose.Schema({
  items: [GoodInItemSchema],
  origin: { type: String, required: true },       
  destination: { type: String, required: true },  
  
}, { timestamps: true });

module.exports = mongoose.model('Transfer', transferSchema);