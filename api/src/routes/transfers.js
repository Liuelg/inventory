const { Router } = require('express');
const router = Router()
const Transfer = require('../models/Transfer')


router.post('/', async (req, res) => {
  try {
    const transfer = new Transfer(req.body);
    await transfer.save();
    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  const transfers = await Transfer.find().populate('product');
  res.json(transfers);
});

module.exports = router