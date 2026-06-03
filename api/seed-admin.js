import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/inventory_db";

const ADMIN = {
  name: "admin",
  email: "admin@gmail.com",
  password: "admin12345",
  role: "admin",
  is_active: true,
};

async function seedAdmin() {
  await mongoose.connect(MONGO_URI);

  const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "sales", "stock"],
      default: "stock",
    },
    is_active: { type: Boolean },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  }, { timestamps: true });

  const User = mongoose.model("User", userSchema);

  const existing = await User.findOne({ email: ADMIN.email });
  if (existing) {
    console.log("Admin account already exists:");
    console.log("  Email:", existing.email);
    console.log("  Role:", existing.role);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
  const user = new User({ ...ADMIN, password: hashedPassword });
  await user.save();

  console.log("Admin account created successfully!");
  console.log("  Email:", ADMIN.email);
  console.log("  Password:", ADMIN.password);
  console.log("  Role:", ADMIN.role);
  console.log("\nIMPORTANT: Please change the default password after first login.");

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error("Error seeding admin:", err.message);
  process.exit(1);
});
