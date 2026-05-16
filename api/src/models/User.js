const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In production, this will be hashed!
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'staff'], 
    default: 'staff' 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
