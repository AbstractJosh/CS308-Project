// Sprint 2 (Luis, Neslihan, SCRUM-59): POST /checkout (handbook 7.4 and 8.3).
// requireAuth, requireRole('CUSTOMER') and checkoutSchema run before this.
import * as checkoutService from '../services/checkout.service.js';

export async function create(req, res, next) {
  try {
    const { order, invoice, emailSent } = await checkoutService.checkout(req.user.id, req.body);
    res.status(201).json({ order, invoice, emailSent });
  } catch (err) {
    next(err);
  }
}
