const express = require('express');
const router = express.Router();
const products = require('../data/products.json');

// Helper to append out_of_stock status as required by Sprint 1
const formatProduct = (item) => ({
    ...item,
    is_out_of_stock: item.stock <= 0
});

// GET /api/products or /api/products?category=:id
router.get('/', (req, res) => {
    const categoryParam = req.query.category || req.query.category_id;
    let filtered = products;

    if (categoryParam !== undefined) {
        const catId = parseInt(categoryParam, 10);
        filtered = filtered.filter(p => p.category_id === catId);
    }

    res.status(200).json(filtered.map(formatProduct));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(formatProduct(product));
});

module.exports = router;
