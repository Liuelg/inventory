import mongoose from "mongoose"
import fs from "fs"
import path from "path"
import Products from "../models/Products.js"
import "dotenv/config"

const uploadDir = "uploads/products"
fs.mkdirSync(uploadDir, { recursive: true })

function isBase64Image(str) {
  return typeof str === "string" && str.startsWith("data:image")
}

function extractBase64Data(dataUrl) {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) return null
  return {
    ext: match[1] === "jpeg" ? "jpg" : match[1],
    data: match[2],
  }
}

async function migrate() {
  const dbURI = process.env.MONGO_URI || "mongodb://localhost:27017/inventory_db"
  await mongoose.connect(dbURI)
  console.log("Connected to MongoDB")

  const products = await Products.find({})
  console.log(`Found ${products.length} total products`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const image = product.image

    if (!image) {
      skipped++
      continue
    }

    if (!isBase64Image(image)) {
      skipped++
      continue
    }

    const extracted = extractBase64Data(image)
    if (!extracted) {
      console.warn(`  Could not parse image for product ${product._id}`)
      failed++
      continue
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extracted.ext}`
    const filepath = path.join(uploadDir, filename)
    const buffer = Buffer.from(extracted.data, "base64")

    fs.writeFileSync(filepath, buffer)

    product.image = `/uploads/products/${filename}`
    await product.save()

    console.log(`  Migrated: ${product.name} -> ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`)
    migrated++
  }

  console.log("\n--- Migration Complete ---")
  console.log(`Migrated: ${migrated}`)
  console.log(`Skipped (already file path or no image): ${skipped}`)
  console.log(`Failed: ${failed}`)

  await mongoose.disconnect()
  console.log("Disconnected from MongoDB")
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
