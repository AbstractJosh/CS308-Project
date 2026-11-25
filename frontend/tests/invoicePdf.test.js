import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadInvoicePdf } from '../src/utils/invoicePdf.js';
import { tokenStore } from '../src/api/client.js';

// SCRUM-55: the invoice download helper on its own (the page tests cover the happy path).
const invoice = { id: 7, invoiceNumber: 'INV-000007' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('downloadInvoicePdf', () => {
  it('says the server cannot be reached when the request itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(downloadInvoicePdf(invoice)).rejects.toMatchObject({
      message: 'Cannot reach the server. Is the backend running?',
      status: 0,
    });
  });

  it('uses the API error message, or a plain one when the answer has no JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve({ error: 'Invoice not found' }) }));
    await expect(downloadInvoicePdf(invoice)).rejects.toMatchObject({ message: 'Invoice not found', status: 404 });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.reject(new Error('not JSON')) }));
    await expect(downloadInvoicePdf(invoice)).rejects.toMatchObject({ message: 'Could not download the invoice (500)' });
  });

  it('frees the file from memory a moment after the download starts', async () => {
    vi.useFakeTimers();
    tokenStore.set('saved-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['%PDF'])) }));
    URL.createObjectURL = vi.fn(() => 'blob:invoice');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadInvoicePdf(invoice);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:invoice');
    expect(document.querySelector('a[download]')).toBeNull(); // the helper link is removed again
  });
});
