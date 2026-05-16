const express = require('express'); 
const mongoose = require('mongoose');
const UserRoutes = require('./routes/users')
const Product = require('./models/Products'); 
const Transfer = require('./models/Transfer');
const Sale = require('./models/Sale');
// const User = require('./models/User');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://mongo:27017/inventory_db')
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find(); 
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.post('/api/transfers', async (req, res) => {
  try {
    const transfer = new Transfer(req.body);
    await transfer.save();
    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/transfers', async (req, res) => {
  const transfers = await Transfer.find().populate('product');
  res.json(transfers);
});

app.post('/api/sales', async (req, res) => {
  try {
    const sale = new Sale(req.body);
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/sales', async (req, res) => {
  const sales = await Sale.find().populate('product');
  res.json(sales);
});

app.route('/users', userRoutes)

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is sprinting on port ${PORT}`);
});