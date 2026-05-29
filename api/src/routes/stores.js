import { Router } from 'express';
const router = Router();
import Store from '../models/Stores.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';


router.post('/', authMiddleware, async (req, res) => {
  try {
    const store = new Store(req.body);
    await store.save();
    res.status(201).json(store);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const stores = await Store.find()
      .populate('manager_id', 'name email') // Pulls in manager's name and email
      .populate('items.item_id', 'name price'); // Pulls in nested product details

    // Find sales users assigned to each store
    const storeIds = stores.map(s => s._id.toString());
    const salesUsers = await User.find({ role: 'sales', store: { $in: storeIds } })
      .select('name email store');

    const salesByStore = new Map();
    for (const user of salesUsers) {
      const sid = user.store?.toString?.();
      if (sid) salesByStore.set(sid, user);
    }

    const enriched = stores.map(store => {
      const obj = store.toObject();
      const salesPerson = salesByStore.get(store._id.toString());
      if (salesPerson) {
        obj.salesPerson = {
          _id: salesPerson._id.toString(),
          name: salesPerson.name,
          email: salesPerson.email,
        };
      }
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('manager_id')
      .populate({ path: 'items.item_id', populate: { path: 'category', select: 'name' } });
    
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updatedStore = await Store.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedStore) return res.status(404).json({ message: 'Store not found' });
    res.json(updatedStore);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({ message: 'Store deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;