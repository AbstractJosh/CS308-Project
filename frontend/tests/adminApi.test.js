import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from '../src/api/endpoints.js';
import { api } from '../src/api/client.js';

// SCRUM-57 review note: checks the real path built in endpoints.js, so only api() is mocked.
vi.mock('../src/api/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  api: vi.fn(() => Promise.resolve({ deliveries: [] })),
}));

beforeEach(() => vi.mocked(api).mockClear());

describe('adminApi.deliveries', () => {
  it('adds ?completed=true for the completed filter', async () => {
    await adminApi.deliveries(true);
    expect(api).toHaveBeenCalledWith('/admin/deliveries?completed=true');
  });

  it('adds ?completed=false for the open deliveries', async () => {
    await adminApi.deliveries(false);
    expect(api).toHaveBeenCalledWith('/admin/deliveries?completed=false');
  });

  it('asks for every delivery when no filter is given', async () => {
    await adminApi.deliveries();
    expect(api).toHaveBeenCalledWith('/admin/deliveries');
  });
});
