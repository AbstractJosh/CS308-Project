// SCRUM-13 (Luis): reads the request, calls one service function, sends { products } or { product }.
import * as productsService from '../services/products.service.js';

// Express 4 does not catch errors from async functions by itself,
// so each handler passes them to next(), which leads to the error handler.

export async function list(req, res, next) {
  try {
    const products = await productsService.listProducts(req.validatedQuery);
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}
