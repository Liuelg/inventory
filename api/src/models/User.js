import { Schema, model } from "mongoose"

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true }, 
  role: { 
    type: String, 
    enum: ['admin', 'sales', 'stock'], 
    default: 'stock' 
  },
  is_active: {type: Boolean},
  store: { type: Schema.Types.ObjectId, ref: 'Store' }
}, { timestamps: true });

export default model('User', userSchema);
