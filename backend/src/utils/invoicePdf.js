// SCRUM-48 (Murat): builds the invoice PDF with PDFKit (handbook 7.6).
// No database here: the caller loads the invoice and passes it in this shape:
//   {
//     invoiceNumber: 'INV-000123',
//     createdAt: Date or ISO string,
//     customer: { name, email, taxId },
//     deliveryAddress: '...',
//     cardLast4: '4242',
//     items: [{ name, model, quantity, unitPrice }],
//     total: 12499,
//   }
// Money may arrive as strings from pg; everything is converted with Number().
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

// PDFKit's built-in Helvetica cannot draw ı, İ, ş, ğ or ₺, so the site's own font
// (Plus Jakarta Sans, SIL Open Font License) is embedded from backend/assets/fonts.
const FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'PlusJakartaSans-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'PlusJakartaSans-Bold.ttf');

// Colours from handbook 9.3 that read well on white paper.
const ACCENT = '#85431E'; // --accent-dark
const GOLD = '#D39858'; // --accent
const TEXT = '#150C0C'; // --bg, used as ink
const MUTED = '#6B5A4E';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'TRY',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// 12499 -> "₺12,499.00", the same format as the frontend's formatPrice.
export function formatTRY(value) {
  return priceFormatter.format(Number(value) || 0);
}

// Order 123 -> "INV-000123" (handbook 6.2 and 7.4).
export function invoiceNumberFor(orderId) {
  return `INV-${String(orderId).padStart(6, '0')}`;
}

// 2026-11-12 -> "12 November 2026", in Istanbul time.
export function formatInvoiceDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });
}

const round2 = (n) => Math.round(n * 100) / 100;

// Turns an invoice into the exact texts the PDF prints. Kept separate from the drawing
// so it can be unit tested. Only the last 4 card digits are ever shown (handbook 7.6).
export function invoiceContent(invoice) {
  const rows = invoice.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    return {
      name: item.name,
      model: item.model,
      quantity: String(quantity),
      unitPrice: formatTRY(unitPrice),
      lineTotal: formatTRY(round2(unitPrice * quantity)),
    };
  });
  return {
    invoiceNumber: invoice.invoiceNumber,
    date: formatInvoiceDate(invoice.createdAt),
    billedTo: [
      invoice.customer.name,
      invoice.customer.email,
      `Tax ID: ${invoice.customer.taxId}`,
    ],
    deliveryAddress: invoice.deliveryAddress,
    payment: `Card ending ${String(invoice.cardLast4).slice(-4)}`,
    rows,
    total: formatTRY(invoice.total),
  };
}

// Column x positions and widths for the items table (A4 is 595 points wide).
const LEFT = 50;
const RIGHT = 545;
const COLUMNS = [
  { key: 'name', x: LEFT, width: 175, align: 'left' },
  { key: 'model', x: 232, width: 118, align: 'left' },
  { key: 'quantity', x: 352, width: 30, align: 'right' },
  { key: 'unitPrice', x: 386, width: 77, align: 'right' },
  { key: 'lineTotal', x: 466, width: 79, align: 'right' },
];
const HEADERS = { name: 'ITEM', model: 'MODEL', quantity: 'QTY', unitPrice: 'UNIT PRICE', lineTotal: 'LINE TOTAL' };

function drawLabel(doc, text, x, y, options = {}) {
  doc.font('regular').fontSize(8).fillColor(GOLD).text(text, x, y, { characterSpacing: 1.5, ...options });
}

// Builds the PDF and resolves with its bytes (a Buffer), ready to send or attach.
export function buildInvoicePdf(invoice) {
  const content = invoiceContent(invoice);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Crema & Co. invoice ${content.invoiceNumber}`,
        Author: 'Crema & Co.',
        CreationDate: new Date(invoice.createdAt),
      },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('regular', FONT_REGULAR);
    doc.registerFont('bold', FONT_BOLD);

    // Header: logo text and tagline on the left, invoice number and date on the right.
    doc.font('bold').fontSize(20).fillColor(TEXT).text('CREMA & CO.', LEFT, 50, { characterSpacing: 3 });
    drawLabel(doc, 'COFFEE · MACHINES · CARE', LEFT, 76);
    doc.font('bold').fontSize(20).fillColor(ACCENT).text('Invoice', 300, 50, { width: RIGHT - 300, align: 'right' });
    doc.font('regular').fontSize(10).fillColor(TEXT).text(content.invoiceNumber, 300, 76, { width: RIGHT - 300, align: 'right' });
    doc.fillColor(MUTED).text(content.date, 300, 90, { width: RIGHT - 300, align: 'right' });
    doc.moveTo(LEFT, 115).lineTo(RIGHT, 115).lineWidth(1).strokeColor(GOLD).stroke();

    // Customer, delivery address and payment in three blocks.
    drawLabel(doc, 'BILLED TO', LEFT, 135);
    doc.font('regular').fontSize(10).fillColor(TEXT).text(content.billedTo.join('\n'), LEFT, 150, { width: 160 });
    drawLabel(doc, 'DELIVER TO', 225, 135);
    doc.font('regular').fontSize(10).fillColor(TEXT).text(content.deliveryAddress, 225, 150, { width: 180 });
    drawLabel(doc, 'PAYMENT', 425, 135);
    doc.font('regular').fontSize(10).fillColor(TEXT).text(content.payment, 425, 150, { width: 120 });

    // Items table.
    let y = 230;
    for (const column of COLUMNS) {
      drawLabel(doc, HEADERS[column.key], column.x, y, { width: column.width, align: column.align, characterSpacing: 1 });
    }
    y += 16;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor('#D9CBBB').stroke();
    y += 8;
    for (const row of content.rows) {
      doc.font('regular').fontSize(10).fillColor(TEXT);
      const rowHeight = Math.max(
        ...COLUMNS.map((column) => doc.heightOfString(row[column.key], { width: column.width })),
      );
      if (y + rowHeight > doc.page.height - 120) {
        doc.addPage();
        y = 50;
      }
      for (const column of COLUMNS) {
        doc.text(row[column.key], column.x, y, { width: column.width, align: column.align });
      }
      y += rowHeight + 10;
      doc.moveTo(LEFT, y - 5).lineTo(RIGHT, y - 5).lineWidth(0.5).strokeColor('#EFE6DB').stroke();
    }

    // Total. If the table ended at the bottom of a page, the total goes on a new page.
    y += 6;
    if (y + 30 > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }
    drawLabel(doc, 'TOTAL', 386, y + 5);
    doc.font('bold').fontSize(14).fillColor(TEXT).text(content.total, 386, y, { width: RIGHT - 386, align: 'right' });

    // Footer on the last page.
    doc
      .font('regular')
      .fontSize(8)
      .fillColor(MUTED)
      .text('Crema & Co. · CS308 Software Engineering · Team 10 · Sabancı University', LEFT, doc.page.height - 70, {
        width: RIGHT - LEFT,
        align: 'center',
        lineBreak: false,
      });

    doc.end();
  });
}
