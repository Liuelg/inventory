const { Router } = require('express')

const router = Router()
const Sale = require('../models/Sale')
router.post('/', async (req, res) => {
  try {
    const sale = new Sale(req.body);
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('store')                  
      .populate({
        path: 'items.item_id',            
        model: 'Product'                  
      });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('store')
      .populate({
        path: 'items.item_id',
        model: 'Product'
      });

    if (!sale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    res.json(sale);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Sale ID format' });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updatedSale = await Sale.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { 
        new: true,         
        runValidators: true 
      }
    ).populate('store').populate({ path: 'items.item_id', model: 'Product' });

    if (!updatedSale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    res.json(updatedSale);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Sale ID format' });
    }
    res.status(400).json({ message: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const deletedSale = await Sale.findByIdAndDelete(req.params.id);

    if (!deletedSale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    res.json({ message: 'Sale record deleted successfully', deletedSale });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Sale ID format' });
    }
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;