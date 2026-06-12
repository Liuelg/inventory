import { Router } from 'express';
const router = Router();
import Store from '../models/Stores.js';
import User from '../models/User.js';
import Products from '../models/Products.js';
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
      .populate('items.group', 'name image')
      .lean();

    if (!store) return res.status(404).json({ message: 'Store not found' });

    const productIds = store.items
      .map(i => i.item_id?._id?.toString?.() || i.item_id?.toString?.())
      .filter(Boolean);

    const products = await Products.find({ _id: { $in: productIds } })
      .populate('category', 'name')
      .lean();

    const productMap = new Map();
    for (const p of products) {
      productMap.set(p._id.toString(), p);
    }

    store.items = store.items.map(item => {
      const itemIdStr = item.item_id?._id?.toString?.() || item.item_id?.toString?.();
      const product = productMap.get(itemIdStr);
      return product ? { ...item, item_id: product } : item;
    });

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

// Delete a specific item from a store's inventory
router.delete('/:id/items/:itemId', authMiddleware, async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
    if (!store) return res.status(404).json({ message: 'Store not found' })

    const itemId = req.params.itemId
    store.items = store.items.filter((i) => i.item_id.toString() !== itemId)
    await store.save()

    res.json({ success: true, message: 'Item removed from store' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router;