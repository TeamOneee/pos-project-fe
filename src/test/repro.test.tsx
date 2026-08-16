import '@/api';

import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect } from 'vitest';

import App from '@/App';
import { authApi } from '@/services';
import { setToken } from '@/api/token';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let caughtErrors: unknown[] = [];
const originalOnError = window.onerror;

beforeEach(async () => {
  caughtErrors = [];
  window.onerror = (message) => {
    caughtErrors.push(message);
    return true;
  };
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.history.pushState({}, '', '/');
  const result = await authApi.login({
    email: 'owner@indomart.com',
    password: 'SecurePassword123!',
  });
  setToken(result.accessToken);
});

describe('repro', () => {
  it('navigates dashboard -> products without looping', async () => {
    render(<App />);
    await waitFor(
      () => {
        expect(window.location.pathname).toBe('/dashboard');
      },
      { timeout: 4000 }
    );

    await act(async () => {
      window.history.pushState({}, '', '/products');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(caughtErrors).toEqual([]);
    expect(window.location.pathname).toBe('/products');
  });

  it('navigates products -> categories (no dashboard involved)', async () => {
    render(<App />);
    await waitFor(
      () => {
        expect(window.location.pathname).toBe('/dashboard');
      },
      { timeout: 4000 }
    );

    for (const path of ['/products', '/categories']) {
      await act(async () => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    expect(caughtErrors).toEqual([]);
    expect(window.location.pathname).toBe('/categories');
  });

  it('navigates dashboard -> products at DESKTOP width', async () => {
    window.innerWidth = 1400;
    render(<App />);
    await waitFor(
      () => {
        expect(window.location.pathname).toBe('/dashboard');
      },
      { timeout: 4000 }
    );

    await act(async () => {
      window.history.pushState({}, '', '/products');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(caughtErrors).toEqual([]);
    expect(window.location.pathname).toBe('/products');
  });
});
