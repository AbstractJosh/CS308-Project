// Sprint 2 (Neslihan, SCRUM-57): GET /admin/deliveries for the product manager.
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
