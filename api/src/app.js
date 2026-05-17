import express from 'express';
import mongoose from 'mongoose';

import userRoutes from './routes/users.js';
import salesRoutes from './routes/sales.js';
import productRoutes from './routes/product.js';
import goodInRoutes from './routes/goodIn.js';
import transferRoutes from './routes/transfers.js';
import storeRoutes from './routes/stores.js';

const app = express();


app.use(express.json());

const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory_db';

mongoose.connect(dbURI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => console.error('Initial MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error('MongoDB runtime error:', err);
});

app.use('/users', userRoutes);
app.use('/sales', salesRoutes);
app.use('/products', productRoutes);
app.use('/goodIns', goodInRoutes);
app.use('/transfers', transferRoutes);
app.use('/stores', storeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});