import { Schema, model } from "mongoose"

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
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

userSchema.index({ role: 1, store: 1 })

export default model('User', userSchema);
