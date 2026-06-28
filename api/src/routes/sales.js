import { Router } from 'express';
import Sale from '../models/Sale.js';
import Store from '../models/Stores.js';
import InvoiceCounter from '../models/InvoiceCounter.js';

const router = Router();

// Helper to deduct sold items from store inventory
async function deductItemsFromStore(storeId, items) {
  const store = await Store.findById(storeId);
  if (!store) {
    throw new Error('Store not found');
  }

  for (const sold of items) {
    const productId = sold.item_id.toString();
    const existing = store.items.find(
      (i) => i.item_id.toString() === productId
    );

    if (!existing) {
      throw new Error('Product not available in store');
    }

    if (existing.quantity < sold.quantity) {
      throw new Error(
        `Insufficient stock for ${existing.item_id?.name || 'product'}. Available: ${existing.quantity}, Requested: ${sold.quantity}`
      );
    }

    existing.quantity -= sold.quantity;
  }

  await store.save();
  return store;
}

// Helper to restore items to store inventory
async function restoreItemsToStore(storeId, items) {
  const store = await Store.findById(storeId);
  if (!store) {
    throw new Error('Store not found');
  }

  for (const item of items) {
    const productId = item.item_id.toString();
    const existing = store.items.find(
      (i) => i.item_id.toString() === productId
    );

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      store.items.push({
        item_id: item.item_id,
        quantity: item.quantity,
        price: (item.eur || 0) + (item.usd || 0) + (item.birr || 0) + (item.visa || 0),
      });
    }
  }

  await store.save();
  return store;
}

router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Use the logged-in user's assigned store
    const storeId = req.user?.store;
    if (!storeId) {
      return res.status(400).json({ message: 'Your account is not assigned to a store. Contact an admin.' });
    }

    // Get store code for invoice generation
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(400).json({ message: 'Assigned store not found.' });
    }
    if (!store.code) {
      return res.status(400).json({ message: 'Assigned store does not have a branch code. Contact an admin.' });
    }

    // Atomically increment invoice counter for this store
    const counter = await InvoiceCounter.findOneAndUpdate(
      { store: storeId },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const invoiceNumber = `${store.code}-${String(counter.sequence).padStart(3, '0')}`;

    // Use prices provided in the request body
    const items = body.items.map((i) => ({
      item_id: i.item_id,
      quantity: i.quantity,
      eur: i.eur ?? 0,
      usd: i.usd ?? 0,
      birr: i.birr ?? 0,
      visa: i.visa ?? 0,
    }));

    // Deduct from store inventory
    await deductItemsFromStore(storeId, items);

    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * ((i.eur || 0) + (i.usd || 0) + (i.birr || 0) + (i.visa || 0))), 0);

    const sale = new Sale({
      ...body,
      store: storeId,
      invoiceNumber,
      items,
      totalAmount,
      processedBy: req.user?.sub,
      salesName: req.user?.name || undefined,
    });
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin ? {} : { store: req.user?.store };

    const sales = await Sale.find(query)
      .populate('store')
      .populate({
        path: 'items.item_id',
        model: 'Products'
      });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, store: req.user?.store };

    const sale = await Sale.findOne(query)
      .populate('store')
      .populate({
        path: 'items.item_id',
        model: 'Products'
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
    const isAdmin = req.user?.role === 'admin';
    const body = { ...req.body };

    // Prevent changing protected fields from the request body
    delete body.store;
    delete body.processedBy;
    delete body.salesName;

    // Non-admins can only edit their own store's sales
    let existingSale = null;
    if (!isAdmin) {
      existingSale = await Sale.findOne({ _id: req.params.id, store: req.user?.store });
      if (!existingSale) {
        return res.status(404).json({ message: 'Sale record not found' });
      }
    }

    // If items are being updated, look up product prices and adjust inventory
    if (body.items !== undefined) {
      if (!existingSale) {
        existingSale = await Sale.findById(req.params.id);
      }

      // Restore old quantities first
      if (existingSale) {
        await restoreItemsToStore(existingSale.store, existingSale.items);
      }

      const items = body.items.map((i) => ({
        item_id: i.item_id,
        quantity: i.quantity,
        eur: i.eur ?? 0,
        usd: i.usd ?? 0,
        birr: i.birr ?? 0,
        visa: i.visa ?? 0,
      }));

      // Deduct new quantities
      const storeId = isAdmin ? existingSale?.store : req.user?.store;
      try {
        await deductItemsFromStore(storeId, items);
      } catch (err) {
        // Restore old quantities back since deduction failed
        if (existingSale) {
          await restoreItemsToStore(existingSale.store, existingSale.items);
        }
        throw err;
      }

      body.items = items;
      body.totalAmount = items.reduce((sum, i) => sum + (i.quantity * ((i.eur || 0) + (i.usd || 0) + (i.birr || 0) + (i.visa || 0))), 0);
    }

    const updatedSale = await Sale.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      {
        new: true,
        runValidators: true
      }
    ).populate('store').populate({ path: 'items.item_id', model: 'Products' });

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
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, store: req.user?.store };

    const deletedSale = await Sale.findOneAndDelete(query);

    if (!deletedSale) {
      return res.status(404).json({ message: 'Sale record not found' });
    }

    // Restore quantities to store inventory
    await restoreItemsToStore(deletedSale.store, deletedSale.items);

    res.json({ message: 'Sale record deleted successfully', deletedSale });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Sale ID format' });
    }
    res.status(500).json({ message: err.message });
  }
});


export default router;
