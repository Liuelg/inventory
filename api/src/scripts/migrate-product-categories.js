import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Products.js";
import Category from "../models/Category.js";

dotenv.config();

async function migrate() {
  const dbURI = process.env.MONGO_URI || "mongodb://localhost:27017/inventory_db";
  await mongoose.connect(dbURI);
  console.log("Connected to MongoDB");

  // Find all products that have a non-empty category string
  const products = await Product.find({ category: { $exists: true, $ne: null, $ne: "" } });
  console.log(`Found ${products.length} products with category strings`);

  // Build a map of category name -> ObjectId
  const nameToId = new Map();

  for (const product of products) {
    const name = product.category;
    if (typeof name !== "string" || !name.trim()) continue;
    const trimmed = name.trim();

    if (nameToId.has(trimmed)) continue;

    let category = await Category.findOne({ name: trimmed });
    if (!category) {
      category = new Category({ name: trimmed });
      await category.save();
      console.log(`Created category: "${trimmed}"`);
    } else {
      console.log(`Found existing category: "${trimmed}"`);
    }
    nameToId.set(trimmed, category._id);
  }

  // Update products to reference the new category ObjectIds
  for (const product of products) {
    const name = product.category;
    if (typeof name !== "string" || !name.trim()) continue;
    const trimmed = name.trim();
    const categoryId = nameToId.get(trimmed);
    if (categoryId) {
      await Product.updateOne({ _id: product._id }, { $set: { category: categoryId } });
      console.log(`Updated product "${product.name}" -> category "${trimmed}"`);
    }
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
