import { Router } from "express";
import fs from "fs";
import path from "path";
import Product from "../models/Products.js";
import Stock from "../models/Stock.js";
import Store from "../models/Stores.js";
import Sale from "../models/Sale.js";
import GoodIn from "../models/Goodin.js";
import Stockout from "../models/Stockout.js";
import Transfer from "../models/Transfer.js";

const router = Router();

function deleteImage(imagePath) {
  if (!imagePath) return;
  const fullPath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);
  fs.promises.unlink(fullPath).catch((err) => {
    if (err.code !== "ENOENT") console.error("Failed to delete image:", err);
  });
}

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    if (req.user?.role !== "admin") {
      delete body.price;
      delete body.previous_prices;
    }

    // Prevent duplicate products by name (case-insensitive)
    const name = body.name?.trim();
    if (name) {
      const existing = await Product.findOne({
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
      });
      if (existing) {
        return res.status(409).json({ message: `A product named "${existing.name}" already exists.` });
      }
    }

    const newProduct = new Product(body);
    const savedProduct = await newProduct.save();
    return res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const products = await Product.find()
      .populate("category")
      .populate("subCategory")
      .sort({ name: 1 });
    return res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("subCategory");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json(product);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid Product ID format" });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const body = req.body;
    if (req.user?.role !== "admin") {
      delete body.price;
      delete body.previous_prices;
    }

    const oldProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: false, runValidators: true }
    );

    if (!oldProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Cascade price update to store items so My Store reflects current product prices
    if (
      body.price?.amount !== undefined &&
      body.price.amount !== oldProduct.price?.amount
    ) {
      await Store.updateMany(
        { "items.item_id": req.params.id },
        { $set: { "items.$[elem].price": body.price.amount } },
        { arrayFilters: [{ "elem.item_id": req.params.id }] }
      );
    }

    if (body.image === "" && oldProduct.image) {
      deleteImage(oldProduct.image);
    }

    const responseProduct = { ...oldProduct.toObject(), ...body };
    res.json(responseProduct);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid Product ID format" });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete products" });
    }
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (deletedProduct.image) {
      deleteImage(deletedProduct.image);
    }

    res.json({ message: "Product deleted successfully", deletedProduct });
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid Product ID format" });
    }
    res.status(500).json({ message: err.message });
  }
});

/**
 * Merge duplicate products by name.
 * Keeps the oldest product as canonical, updates all references,
 * deletes duplicates. Store and Stock quantities are summed.
 */
router.post("/merge-duplicates", async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admins can merge products" });
    }

    const products = await Product.find().sort({ createdAt: 1 }).lean();
    const groups = new Map();

    for (const p of products) {
      const key = p.name?.toLowerCase().trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const merged = [];
    const collections = [
      { model: Stock, name: "Stock" },
      { model: Store, name: "Store" },
      { model: Sale, name: "Sale" },
      { model: GoodIn, name: "GoodIn" },
      { model: Stockout, name: "Stockout" },
      { model: Transfer, name: "Transfer" },
    ];

    for (const [key, group] of groups) {
      if (group.length < 2) continue;

      const canonical = group[0];
      const duplicates = group.slice(1);
      const dupIds = duplicates.map((d) => d._id.toString());

      for (const dupId of dupIds) {
        for (const { model } of collections) {
          await model.updateMany(
            { "items.item_id": dupId },
            { $set: { "items.$[elem].item_id": canonical._id } },
            { arrayFilters: [{ "elem.item_id": dupId }] }
          );
        }
      }

      // After item_id updates, deduplicate items within Store and Stock
      // documents that now have the same item_id twice. Quantities are summed.
      const affectedStores = await Store.find({ "items.item_id": canonical._id });
      for (const store of affectedStores) {
        const mergedItems = [];
        const quantities = new Map();
        for (const item of store.items) {
          const id = item.item_id.toString();
          if (quantities.has(id)) {
            quantities.set(id, quantities.get(id) + (item.quantity || 0));
          } else {
            quantities.set(id, item.quantity || 0);
            mergedItems.push(item);
          }
        }
        for (const item of mergedItems) {
          item.quantity = quantities.get(item.item_id.toString());
        }
        if (mergedItems.length !== store.items.length) {
          store.items = mergedItems;
          await store.save();
        }
      }

      const affectedStocks = await Stock.find({ "items.item_id": canonical._id });
      for (const stock of affectedStocks) {
        const mergedItems = [];
        const quantities = new Map();
        const remainings = new Map();
        for (const item of stock.items) {
          const id = item.item_id.toString();
          if (quantities.has(id)) {
            quantities.set(id, quantities.get(id) + (item.quantity || 0));
            remainings.set(id, remainings.get(id) + (item.remaining || 0));
          } else {
            quantities.set(id, item.quantity || 0);
            remainings.set(id, item.remaining || 0);
            mergedItems.push(item);
          }
        }
        for (const item of mergedItems) {
          const id = item.item_id.toString();
          item.quantity = quantities.get(id);
          item.remaining = remainings.get(id);
        }
        if (mergedItems.length !== stock.items.length) {
          stock.items = mergedItems;
          await stock.save();
        }
      }

      // Delete duplicate products
      await Product.deleteMany({ _id: { $in: dupIds } });

      // Clean up duplicate images
      for (const dup of duplicates) {
        if (dup.image && dup.image !== canonical.image) {
          deleteImage(dup.image);
        }
      }

      merged.push({
        name: canonical.name,
        kept: canonical._id,
        removed: dupIds,
        count: duplicates.length,
      });
    }

    res.json({
      message: `Merged ${merged.length} duplicate groups.`,
      merged,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
