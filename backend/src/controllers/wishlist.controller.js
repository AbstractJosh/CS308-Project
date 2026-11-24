// Sprint 3 (Ulukan, SCRUM-80): reads the request, calls one wishlist service function,
// sends { products }. Every route runs after requireAuth and requireRole('CUSTOMER').
import * as wishlistService from '../services/wishlist.service.js';

export async function list(req, res, next) {
  try {
    res.json({ products: await wishlistService.getWishlist(req.user.id) });
  } catch (err) {
    next(err);
  }
}

export async function add(req, res, next) {
  try {
    res.json({ products: await wishlistService.addProduct(req.user.id, req.body.productId) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    res.json({ products: await wishlistService.removeProduct(req.user.id, req.params.productId) });
  } catch (err) {
    next(err);
  }
}
