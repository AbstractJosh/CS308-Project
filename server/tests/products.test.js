const request = require('supertest');
const app = require('../index');

describe('Products API (/api/products)', () => {
    describe('GET /api/products', () => {
        it('should return status 200 and all products', async () => {
            const res = await request(app).get('/api/products');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('should ensure each product has all required fields and computed is_out_of_stock', async () => {
            const res = await request(app).get('/api/products');
            expect(res.statusCode).toBe(200);

            res.body.forEach((item) => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('name');
                expect(item).toHaveProperty('description');
                expect(item).toHaveProperty('price');
                expect(item).toHaveProperty('stock');
                expect(item).toHaveProperty('category_id');
                expect(item).toHaveProperty('image_url');
                expect(item).toHaveProperty('is_out_of_stock');
                expect(typeof item.is_out_of_stock).toBe('boolean');
            });
        });

        it('should correctly compute is_out_of_stock based on stock count', async () => {
            const res = await request(app).get('/api/products');
            expect(res.statusCode).toBe(200);

            const inStockItem = res.body.find((p) => p.stock > 0);
            const outOfStockItem = res.body.find((p) => p.stock <= 0);

            expect(inStockItem).toBeDefined();
            expect(inStockItem.is_out_of_stock).toBe(false);

            expect(outOfStockItem).toBeDefined();
            expect(outOfStockItem.is_out_of_stock).toBe(true);
        });

        it('should filter products by category query parameter', async () => {
            const categoryId = 1;
            const res = await request(app).get(`/api/products?category=${categoryId}`);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);

            res.body.forEach((item) => {
                expect(item.category_id).toBe(categoryId);
            });
        });

        it('should return an empty array if category does not match any products', async () => {
            const res = await request(app).get('/api/products?category=9999');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });
    });

    describe('GET /api/products/:id', () => {
        it('should return status 200 and product details for a valid ID', async () => {
            const res = await request(app).get('/api/products/1');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('id', 1);
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('is_out_of_stock');
        });

        it('should return status 404 with error message for a non-existent ID', async () => {
            const res = await request(app).get('/api/products/99999');
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Product not found');
        });
    });

    describe('GET / (Health Check)', () => {
        it('should return status 200 and running message', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toBe(200);
            expect(res.text).toContain('Crema & Co. API is running');
        });
    });
});

