import { defineConfig } from 'vitest/config';

// Tests never need a database: unit tests use pure functions and
// API tests mock the service with vi.mock (handbook 11.3).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret' },
  },
});
