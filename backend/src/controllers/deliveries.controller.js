// Sprint 2 (Neslihan, SCRUM-57 and SCRUM-60): the product manager's delivery list and order status.
// requireAuth, requireRole('PRODUCT_MANAGER') and the query check run before this.
import * as deliveryService from '../services/delivery.service.js';

export async function list(req, res, next) {
  try {
    const deliveries = await deliveryService.listDeliveries(req.validatedQuery);
    res.json({ deliveries });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/orders/:id/status (SCRUM-60). The id and the body are checked before this.
export async function updateStatus(req, res, next) {
  try {
    const order = await deliveryService.updateOrderStatus(req.params.id, req.body.status);
    res.json({ order });
  } catch (err) {
    next(err);
  }
}
