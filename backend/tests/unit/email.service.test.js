// SCRUM-48 (Murat): the email service. nodemailer and the settings are mocked,
// so no email is sent and no internet is needed.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: { smtp: { host: '', port: 587, user: '', pass: '', from: 'Crema & Co. <no-reply@crema.com>' } },
  sendMail: vi.fn(),
  createTransport: vi.fn(),
  createTestAccount: vi.fn(),
  getTestMessageUrl: vi.fn(),
}));

vi.mock('../../src/config/env.js', () => ({ env: mocks.env }));
vi.mock('nodemailer', () => ({
  default: {
    createTransport: mocks.createTransport,
    createTestAccount: mocks.createTestAccount,
    getTestMessageUrl: mocks.getTestMessageUrl,
  },
}));

const etherealAccount = {
  user: 'abc@ethereal.email',
  pass: 'secret',
  smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
};

// The service keeps one transporter in memory, so each test loads a fresh copy of it.
async function loadService() {
  vi.resetModules();
  return import('../../src/services/email.service.js');
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.env.smtp, { host: '', port: 587, user: '', pass: '' });
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
  mocks.createTestAccount.mockResolvedValue(etherealAccount);
  mocks.sendMail.mockResolvedValue({ messageId: '<id-1@crema>' });
  mocks.getTestMessageUrl.mockReturnValue('https://ethereal.email/message/abc');
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('email service', () => {
  it('uses an Ethereal test inbox when there are no SMTP settings', async () => {
    const { sendMail } = await loadService();
    const result = await sendMail({ to: 'customer@crema.com', subject: 'Hi', text: 'Hello' });

    expect(mocks.createTestAccount).toHaveBeenCalledTimes(1);
    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: 'abc@ethereal.email', pass: 'secret' },
    });
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Crema & Co. <no-reply@crema.com>', to: 'customer@crema.com', subject: 'Hi' }),
    );
    expect(result).toEqual({ messageId: '<id-1@crema>', previewUrl: 'https://ethereal.email/message/abc' });
  });

  it('uses the SMTP server from .env when SMTP_HOST is set', async () => {
    Object.assign(mocks.env.smtp, { host: 'smtp.example.com', port: 465, user: 'shop', pass: 'pw' });
    mocks.getTestMessageUrl.mockReturnValue(false); // real servers have no preview link
    const { sendMail } = await loadService();
    const result = await sendMail({ to: 'a@b.com', subject: 'Hi', text: 'Hello' });

    expect(mocks.createTestAccount).not.toHaveBeenCalled();
    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'shop', pass: 'pw' },
    });
    expect(result.previewUrl).toBeNull();
  });

  it('makes the transporter once and reuses it for later emails', async () => {
    const { sendMail } = await loadService();
    await sendMail({ to: 'a@b.com', subject: '1', text: '1' });
    await sendMail({ to: 'a@b.com', subject: '2', text: '2' });
    expect(mocks.createTestAccount).toHaveBeenCalledTimes(1);
    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });

  it('rejects when the inbox cannot be created, and tries again on the next email', async () => {
    mocks.createTestAccount.mockRejectedValueOnce(new Error('offline'));
    const { sendMail } = await loadService();
    await expect(sendMail({ to: 'a@b.com', subject: 'Hi', text: 'x' })).rejects.toThrow('offline');
    await expect(sendMail({ to: 'a@b.com', subject: 'Hi', text: 'x' })).resolves.toMatchObject({ messageId: '<id-1@crema>' });
    expect(mocks.createTestAccount).toHaveBeenCalledTimes(2);
  });

  it('sends the invoice email with the PDF attached', async () => {
    const { sendInvoiceEmail } = await loadService();
    const pdf = Buffer.from('%PDF-1.3 test');
    await sendInvoiceEmail({ to: 'customer@crema.com', name: 'Demo Customer', invoiceNumber: 'INV-000123', pdf });

    const message = mocks.sendMail.mock.calls[0][0];
    expect(message.to).toBe('customer@crema.com');
    expect(message.subject).toBe('Your Crema & Co. invoice INV-000123');
    expect(message.text).toContain('Hi Demo Customer');
    expect(message.attachments).toEqual([
      { filename: 'INV-000123.pdf', content: pdf, contentType: 'application/pdf' },
    ]);
  });
});
