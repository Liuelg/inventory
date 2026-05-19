import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // Import the cors package
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js"; // This is your Better Auth instance
import 'dotenv/config';

import userRoutes from './routes/users.js';
import salesRoutes from './routes/sales.js';
import productRoutes from './routes/product.js';
import goodInRoutes from './routes/goodIn.js';
import transferRoutes from './routes/transfers.js';
import storeRoutes from './routes/stores.js';
import categoryRoutes from './routes/categories.js';
import subCategoryRoutes from './routes/subCategories.js';
import authRoutes from './routes/auth.js';

const app = express();

// 1. FIXED CORS CONFIGURATION (Crucial for Better Auth cookies)
app.use(cors({
  origin: 'http://localhost:5173', // Adjust this to match your React Vite app's exact URL
  credentials: true,               // Allows cookies to travel back and forth across domains
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. BETTER AUTH HANDLER
// This line catches all auth events (login, sign up, session checks) 
// and hands them directly over to Better Auth.
app.all("/api/auth/*", toNodeHandler(auth));

// Database connection
// eslint-disable-next-line no-undef
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory_db';
mongoose.connect(dbURI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => console.error('Initial MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error('MongoDB runtime error:', err);
});

// Your Application Routes
app.use('/users', userRoutes);
app.use('/sales', salesRoutes);
app.use('/products', productRoutes);
app.use('/goodIns', goodInRoutes);
app.use('/transfers', transferRoutes);
app.use('/stores', storeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sub-categories', subCategoryRoutes);
app.use('/api/auth', authRoutes); // Custom routes if any, placed after Better Auth handler

// Error and Fallback Handlers
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});