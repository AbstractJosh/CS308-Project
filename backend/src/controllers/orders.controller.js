// Sprint 2 (Luis, SCRUM-105): order history, GET /orders and GET /orders/:id (handbook 8.3).
// requireAuth (and for :id the id check) run before this, so req.user is the logged-in user.
import * as orderService from '../services/order.service.js';

export async function list(req, res, next) {
  try {
    const orders = await orderService.listOrders(req.user.id);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const order = await orderService.getOrderForUser(req.params.id, req.user);
    res.json({ order });
  } catch (err) {
    next(err);
  }
}
