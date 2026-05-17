import { Schema, model } from "mongoose"

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, 
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'staff'], 
    default: 'staff' 
  },
  is_active: {type: Boolean}
}, { timestamps: true });

export default model('User', userSchema);
