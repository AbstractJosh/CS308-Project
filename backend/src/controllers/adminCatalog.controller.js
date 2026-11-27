// Sprint 3, SCRUM-77 (Murat): the product manager's products, categories and stock (req 12).
// requireAuth, requireRole('PRODUCT_MANAGER') and the id and body checks run before these.
import * as adminCatalogService from '../services/adminCatalog.service.js';

export async function listProducts(req, res, next) {
  try {
    const products = await adminCatalogService.listProducts();
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await adminCatalogService.createProduct(req.body);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await adminCatalogService.updateProduct(req.params.id, req.body);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

// 204: done, nothing to send back.
export async function removeProduct(req, res, next) {
  try {
    await adminCatalogService.removeProduct(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function setStock(req, res, next) {
  try {
    const product = await adminCatalogService.setStock(req.params.id, req.body.quantityInStock);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await adminCatalogService.createCategory(req.body);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    await adminCatalogService.deleteCategory(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
