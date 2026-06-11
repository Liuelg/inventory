import { Router } from "express";
import fs from "fs";
import path from "path";
import Product from "../models/Products.js";
import { uploadProductImage } from "../middleware/upload.js";

const router = Router();

function deleteImage(imagePath) {
  if (!imagePath) return;
  const fullPath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);
  fs.promises.unlink(fullPath).catch((err) => {
    if (err.code !== "ENOENT") console.error("Failed to delete image:", err);
  });
}

function parseBody(req) {
  if (req.body.data) {
    try {
      return JSON.parse(req.body.data);
    } catch {
      return { ...req.body };
    }
  }
  return { ...req.body };
}

router.post("/", uploadProductImage, async (req, res) => {
  try {
    const body = parseBody(req);
    if (req.user?.role !== "admin") {
      delete body.price;
      delete body.previous_prices;
    }
    if (req.file) {
      body.image = `/uploads/products/${req.file.filename}`;
    }
    const newProduct = new Product(body);
    const savedProduct = await newProduct.save();
    return res.status(201).json(savedProduct);
  } catch (err) {
    if (req.file) {
      deleteImage(req.file.path);
    }
    res.status(400).json({ message: err.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const products = await Product.find()
      .populate("category")
      .populate("subCategory");
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

router.patch("/:id", uploadProductImage, async (req, res) => {
  try {
    const body = parseBody(req);
    if (req.user?.role !== "admin") {
      delete body.price;
      delete body.previous_prices;
    }

    if (req.file) {
      body.image = `/uploads/products/${req.file.filename}`;
    }

    const oldProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: false, runValidators: true }
    );

    if (!oldProduct) {
      if (req.file) deleteImage(req.file.path);
      return res.status(404).json({ message: "Product not found" });
    }

    if ((req.file || body.image === "") && oldProduct.image) {
      deleteImage(oldProduct.image);
    }

    const responseProduct = { ...oldProduct.toObject(), ...body };
    res.json(responseProduct);
  } catch (err) {
    if (req.file) deleteImage(req.file.path);
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

export default router;
