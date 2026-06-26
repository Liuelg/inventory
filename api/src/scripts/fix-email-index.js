import mongoose from 'mongoose'
import 'dotenv/config'

async function main() {
  const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory_db'
  await mongoose.connect(dbURI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db
  const collection = db.collection('users')

  // List existing indexes
  const indexes = await collection.indexes()
  console.log('Existing indexes on users collection:')
  indexes.forEach((idx) => {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${!!idx.unique}, sparse: ${!!idx.sparse})`)
  })

  // Drop the old non-sparse email unique index if it exists
  const emailIndex = indexes.find((idx) => idx.key && idx.key.email === 1)
  if (emailIndex) {
    if (!emailIndex.sparse) {
      console.log(`Dropping old non-sparse index: ${emailIndex.name}`)
      await collection.dropIndex(emailIndex.name)
      console.log('Old index dropped.')
    } else {
      console.log('Email index is already sparse. No change needed.')
    }
  }

  // Create the sparse unique index
  console.log('Creating sparse unique index on email...')
  await collection.createIndex({ email: 1 }, { unique: true, sparse: true })
  console.log('Sparse unique index created successfully.')

  await mongoose.disconnect()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
