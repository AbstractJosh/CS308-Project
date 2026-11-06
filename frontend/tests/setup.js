import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 25 and newer have their own experimental localStorage, which is empty in tests
// and hides the browser one from jsdom. Put the jsdom versions back so tests behave the
// same on every Node version (CI uses Node 20).
for (const name of ['localStorage', 'sessionStorage']) {
  const current = Object.getOwnPropertyDescriptor(globalThis, name);
  if (globalThis.jsdom && current && current.get) {
    Object.defineProperty(globalThis, name, {
      value: globalThis.jsdom.window[name],
      configurable: true,
      writable: true,
    });
  }
}

// Runs after every frontend test.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
