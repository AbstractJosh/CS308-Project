// Sprint 2, SCRUM-49 (Murat): GET /invoices/:id/pdf (handbook 7.6 and 8.3).
// requireAuth and the id check run before this; the service checks who may see the invoice.
import * as invoiceService from '../services/invoice.service.js';

export async function pdf(req, res, next) {
  try {
    const { invoiceNumber, pdf } = await invoiceService.getInvoicePdf(req.params.id, req.user);
    res.set('Content-Type', 'application/pdf');
    // inline: the browser shows the PDF in a tab; the file name is used when it is saved.
    res.set('Content-Disposition', `inline; filename="${invoiceNumber}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

// Sprint 3, SCRUM-77: GET /admin/invoices (product manager). The query is checked before this.
export async function adminList(req, res, next) {
  try {
    const invoices = await invoiceService.listInvoices(req.validatedQuery);
    res.json({ invoices });
  } catch (err) {
    next(err);
  }
}
