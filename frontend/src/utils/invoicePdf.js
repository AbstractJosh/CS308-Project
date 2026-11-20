import { tokenStore } from '../api/client.js';

// Downloads an invoice PDF (SCRUM-54). Owner: Sezin.
// GET /api/invoices/:id/pdf needs the login token, so a plain link cannot open it, and api()
// in client.js only reads JSON. docs/API.md ("Invoices") says to fetch it with the token and
// hand the file to the browser, which is what this does.
// invoice = { id, invoiceNumber } from the POST /checkout answer.
export async function downloadInvoicePdf(invoice) {
  let res;
  try {
    res = await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}/pdf`, {
      headers: { Authorization: `Bearer ${tokenStore.get()}` },
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Is the backend running?'), { status: 0 });
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || `Could not download the invoice (${res.status})`), {
      status: res.status,
    });
  }

  // The browser saves the file as INV-000123.pdf.
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoiceNumber}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the file.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
