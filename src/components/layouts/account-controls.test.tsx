/**
 * The way out, and the fact that it cannot be hidden.
 *
 * The account chip used to live at the foot of the sidebar. The desktop sidebar
 * collapses, and when it did the chip went with it — leaving the app with no
 * sign-out at all until you expanded the sidebar again. The first test is that
 * bug; the rest guard the confirmation that came with moving it into the header,
 * where a mis-click sits next to the controls people use all day.
 */

import '@/api';

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { resetDb } from '@/api/mock/db';
import { setToken } from '@/api/token';
import { authApi } from '@/services';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const DESKTOP = 1400;

async function openAs(email: string, path: string, width: number) {
  resetDb();
  const result = await authApi.login({ email, password: 'password123' });
  setToken(result.accessToken);

  window.innerWidth = width;
  window.history.pushState({}, '', path);

  await act(async () => {
    render(<App />);
    window.dispatchEvent(new Event('resize'));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
}

/** The header's sign-out control, named for whoever is signed in. */
function signOutButton() {
  return screen.queryByRole('button', { name: /^Keluar dari akun/ });
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

beforeEach(() => {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  window.history.pushState({}, '', '/');
});

describe('signing out', () => {
  it('stays reachable when the desktop sidebar is collapsed', async () => {
    await openAs('sari@indomart.com', '/categories', DESKTOP);
    expect(signOutButton()).toBeInTheDocument();

    await click(screen.getByRole('button', { name: /Sembunyikan menu samping/ }));

    // The sidebar is what folded away; the way out is not inside it any more.
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(signOutButton()).toBeInTheDocument();
  });

  it('is on the cashier till, which has no sidebar at all', async () => {
    await openAs('budi@indomart.com', '/pos', DESKTOP);

    expect(signOutButton()).toBeInTheDocument();
  });

  it('asks before it clears the session', async () => {
    await openAs('sari@indomart.com', '/categories', DESKTOP);

    await click(signOutButton() as HTMLElement);

    expect(await screen.findByText('Keluar dari akun?')).toBeInTheDocument();
    /*
     * Still signed in: the dialog is a question, not a countdown. Asserted on
     * the route rather than on the header button, which Radix correctly drops
     * out of the accessibility tree while a modal is open.
     */
    expect(window.location.pathname).toBe('/categories');
  });

  it('leaves the session alone when the question is declined', async () => {
    await openAs('sari@indomart.com', '/categories', DESKTOP);

    await click(signOutButton() as HTMLElement);
    await click(screen.getByRole('button', { name: 'Batal' }));

    expect(screen.queryByText('Keluar dari akun?')).toBeNull();
    expect(signOutButton()).toBeInTheDocument();
  });

  it('signs out when the question is answered', async () => {
    await openAs('sari@indomart.com', '/categories', DESKTOP);

    await click(signOutButton() as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    await click(
      Array.from(dialog.querySelectorAll('button')).find(
        (button) => button.textContent === 'Keluar'
      ) as HTMLElement
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    // Back to the login screen, with nothing left to sign out of.
    expect(signOutButton()).toBeNull();
  });
});
