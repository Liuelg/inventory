import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/inventory_db";

const EMAIL = process.argv[2];
const NEW_PASSWORD = process.argv[3];

if (!EMAIL || !NEW_PASSWORD) {
  console.error("Usage: node hash-password.js <email> <new_password>");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);

  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: String,
    is_active: Boolean,
  }, { timestamps: true });

  const User = mongoose.model("User", userSchema);

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.error("User not found:", EMAIL);
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);
  user.password = hashed;
  await user.save();

  console.log("Password updated and hashed successfully for:", EMAIL);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
