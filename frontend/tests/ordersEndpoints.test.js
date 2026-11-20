import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenStore } from '../src/api/client.js';
import { ordersApi } from '../src/api/endpoints.js';

const fetchMock = vi.fn();
const reply = (status, body) => ({ ok: status < 400, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  tokenStore.set('saved-token');
});

afterEach(() => vi.unstubAllGlobals());

describe('ordersApi', () => {
  it('lists the orders with the saved token', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { orders: [] }));
    await expect(ordersApi.list()).resolves.toEqual({ orders: [] });
    expect(fetchMock).toHaveBeenCalledWith('/api/orders', {
      method: 'GET',
      headers: { Authorization: 'Bearer saved-token' },
      body: undefined,
    });
  });

  it('gets one order by id', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { order: { id: 14 } }));
    await expect(ordersApi.get(14)).resolves.toEqual({ order: { id: 14 } });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/orders/14');
  });

  it('encodes the id in the address', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { order: {} }));
    await ordersApi.get('a/b c');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/orders/a%2Fb%20c');
  });

  it('rejects with status 404 and the server message for an unknown order', async () => {
    fetchMock.mockResolvedValueOnce(reply(404, { error: 'Order not found' }));
    await expect(ordersApi.get(999)).rejects.toMatchObject({ status: 404, message: 'Order not found' });
  });
});
