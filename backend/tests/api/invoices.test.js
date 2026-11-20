import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import { forbidden, notFound } from '../../src/utils/httpError.js';
import * as invoiceService from '../../src/services/invoice.service.js';

// SCRUM-49: GET /invoices/:id/pdf (handbook 7.6 and 8.3, req 4). The service is mocked, so these
// tests check the route: login, the id check, the PDF headers and the error answers.
vi.mock('../../src/services/invoice.service.js', () => ({ getInvoicePdf: vi.fn() }));

const bearer = (id, role) => ({ Authorization: `Bearer ${signToken({ id, role })}` });
const fakePdf = Buffer.from('%PDF-1.3 fake invoice');

beforeEach(() => vi.resetAllMocks());

describe('GET /api/invoices/:id/pdf', () => {
  it('answers 401 without a token', async () => {
    const res = await request(app).get('/api/invoices/7/pdf');
    expect(res.status).toBe(401);
    expect(invoiceService.getInvoicePdf).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-3', '1.5'])('answers 400 for the id %s', async (id) => {
    const res = await request(app).get(`/api/invoices/${id}/pdf`).set(bearer(1, 'CUSTOMER'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid id');
    expect(invoiceService.getInvoicePdf).not.toHaveBeenCalled();
  });

  it('sends the PDF with its content type and file name', async () => {
    invoiceService.getInvoicePdf.mockResolvedValue({ invoiceNumber: 'INV-000123', pdf: fakePdf });
    const res = await request(app).get('/api/invoices/7/pdf').set(bearer(1, 'CUSTOMER'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('inline; filename="INV-000123.pdf"');
    expect(Buffer.from(res.body).equals(fakePdf)).toBe(true);
    // The id from the URL (as a number) and the user from the token go to the service.
    expect(invoiceService.getInvoicePdf).toHaveBeenCalledWith(7, { id: 1, role: 'CUSTOMER' });
  });

  it('answers 403 when the service says the user may not see it', async () => {
    invoiceService.getInvoicePdf.mockRejectedValue(forbidden());
    const res = await request(app).get('/api/invoices/7/pdf').set(bearer(2, 'CUSTOMER'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'You do not have permission to do this' });
  });

  it('answers 404 for an unknown invoice', async () => {
    invoiceService.getInvoicePdf.mockRejectedValue(notFound('Invoice not found'));
    const res = await request(app).get('/api/invoices/999/pdf').set(bearer(1, 'CUSTOMER'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Invoice not found' });
  });
});
