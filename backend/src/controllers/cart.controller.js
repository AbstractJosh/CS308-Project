// Sprint 2 (Luis): reads the request, calls one cart service function, sends { cart }.
// Every cart route runs after requireAuth, so req.user.id is the logged-in user.
import * as cartService from '../services/cart.service.js';

// Express 4 does not catch errors from async functions by itself,
// so each handler passes them to next(), which leads to the error handler.

export async function get(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.json({ cart });
  } catch (err) {
    next(err);
  }
}

export async function addItem(req, res, next) {
  try {
    const cart = await cartService.addItem(req.user.id, req.body);
    res.json({ cart });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const cart = await cartService.updateQuantity(req.user.id, req.params.productId, req.body.quantity);
    res.json({ cart });
  } catch (err) {
    next(err);
  }
}

export async function removeItem(req, res, next) {
  try {
    const cart = await cartService.removeItem(req.user.id, req.params.productId);
    res.json({ cart });
  } catch (err) {
    next(err);
  }
}

export async function clear(req, res, next) {
  try {
    const cart = await cartService.clearCart(req.user.id);
    res.json({ cart });
  } catch (err) {
    next(err);
  }
}

export async function merge(req, res, next) {
  try {
    const cart = await cartService.mergeCart(req.user.id, req.body.items);
    res.json({ cart });
  } catch (err) {
    next(err);
  }
}
