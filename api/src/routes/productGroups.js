import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import ProductGroup from '../models/ProductGroup.js'
import Product from '../models/Products.js'

const router = Router()
const uploadDir = 'uploads/products'

function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image')
}

function extractBase64Data(dataUrl) {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) return null
  return {
    ext: match[1] === 'jpeg' ? 'jpg' : match[1],
    data: match[2],
  }
}

async function persistBase64Image(imageStr) {
  if (!isBase64Image(imageStr)) return imageStr

  const extracted = extractBase64Data(imageStr)
  if (!extracted) return imageStr

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extracted.ext}`
  const filepath = path.join(uploadDir, filename)

  await fs.promises.mkdir(uploadDir, { recursive: true })
  await fs.promises.writeFile(filepath, Buffer.from(extracted.data, 'base64'))

  return `/uploads/products/${filename}`
}

async function resolveGroupItems(items, groupCategory, groupSubCategory) {
  const resolved = []
  const nameItems = []

  for (const [index, item] of (items || []).entries()) {
    if (item.product) {
      // Existing product reference
      resolved[index] = { product: item.product, quantity: item.quantity }
    } else if (item.name) {
      nameItems.push({ ...item, index })
    }
  }

  if (nameItems.length === 0) {
    return resolved
  }

  // Batch query existing products by name
  const names = nameItems.map((i) => i.name.trim())
  const existingProducts = await Product.find({ name: { $in: names } })
  const existingMap = new Map()
  for (const p of existingProducts) {
    if (!existingMap.has(p.name)) {
      existingMap.set(p.name, p)
    }
  }

  // Build new product docs (converting base64 images to files concurrently)
  const newProductDocs = []
  const newProductMeta = []

  await Promise.all(
    nameItems.map(async (item) => {
      const trimmedName = item.name.trim()
      const existing = existingMap.get(trimmedName)

      if (existing) {
        resolved[item.index] = { product: existing._id, quantity: item.quantity }
      } else {
        const image = item.image ? await persistBase64Image(item.image) : undefined
        newProductDocs.push({
          name: trimmedName,
          category: item.category || groupCategory || undefined,
          subCategory: item.subCategory || groupSubCategory || undefined,
          price: { amount: 0, currency: 'USD' },
          image,
        })
        newProductMeta.push({ index: item.index, quantity: item.quantity })
      }
    })
  )

  // Batch insert new products
  if (newProductDocs.length > 0) {
    const created = await Product.insertMany(newProductDocs)
    for (let i = 0; i < created.length; i++) {
      resolved[newProductMeta[i].index] = {
        product: created[i]._id,
        quantity: newProductMeta[i].quantity,
      }
    }
  }

  return resolved
}

router.post('/', async (req, res, next) => {
  try {
    const resolvedItems = await resolveGroupItems(
      req.body.items,
      req.body.category,
      req.body.subCategory
    )

    const group = new ProductGroup({
      ...req.body,
      items: resolvedItems,
    })
    await group.save()
    await group.populate({
      path: 'items.product',
      select: 'name price image category subCategory',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'subCategory', select: 'name' }
      ]
    })
    await group.populate('category', 'name')
    await group.populate('subCategory', 'name')
    res.status(201).json(group)
  } catch (err) {
    next(err)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const groups = await ProductGroup.find()
      .populate({
        path: 'items.product',
        select: 'name price image category subCategory',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'subCategory', select: 'name' }
        ]
      })
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .sort({ createdAt: -1 })
    res.json(groups)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const group = await ProductGroup.findById(req.params.id)
      .populate({
        path: 'items.product',
        select: 'name price image category subCategory',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'subCategory', select: 'name' }
        ]
      })
      .populate('category', 'name')
      .populate('subCategory', 'name')

    if (!group) {
      return res.status(404).json({ message: 'Product group not found' })
    }

    res.json(group)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    let update = { ...req.body }

    if (req.body.items) {
      const resolvedItems = await resolveGroupItems(
        req.body.items,
        req.body.category,
        req.body.subCategory
      )
      update.items = resolvedItems
    }

    const group = await ProductGroup.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'items.product',
        select: 'name price image category subCategory',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'subCategory', select: 'name' }
        ]
      })
      .populate('category', 'name')
      .populate('subCategory', 'name')

    if (!group) {
      return res.status(404).json({ message: 'Product group not found' })
    }

    res.json(group)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const group = await ProductGroup.findByIdAndDelete(req.params.id)
    if (!group) {
      return res.status(404).json({ message: 'Product group not found' })
    }
    res.json({ message: 'Product group deleted successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
