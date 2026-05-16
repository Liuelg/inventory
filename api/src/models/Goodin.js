const mongoose = require('mongoose');
const { Schema } = mongoose;


const GoodInItemSchema = new Schema({
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
}, { _id: false });


const goodSchema = new mongoose.Schema({
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  items: [GoodInItemSchema], 
  is_accepted: {
    type: Boolean,
    default: false
  },
  accepted_at: {
    type: Date,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model('Goodin', goodSchema);