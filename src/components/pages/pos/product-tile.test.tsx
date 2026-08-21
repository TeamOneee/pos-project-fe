/**
 * The tile's count circle, and the one thing that makes it a count circle rather than a stray
 * badge: it is anchored to the tile.
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductTile } from '@/components/pages/pos/product-tile';
import type { PosProduct } from '@/lib/pos-catalog';

const PRODUCT: PosProduct = {
  productId: 'prd_teh',
  name: 'Es Teh Manis',
  price: 5000,
  categoryId: 'cat_minuman',
  categoryName: 'Minuman',
  stock: 192,
};

function tileFor(inCart: number) {
  render(<ProductTile product={PRODUCT} inCart={inCart} onPress={vi.fn()} />);
  return screen.getByRole('button', { name: /Es Teh Manis/ });
}

describe('the POS product tile', () => {
  it('anchors the count circle to itself, not the viewport', () => {
    const tile = tileFor(4);

    // The circle is a child of the tile...
    const circle = within(tile).getByText('4');
    expect(tile).toContainElement(circle);

    // ...and the tile establishes the containing block it positions against.
    expect(tile.className).toMatch(/(^|\s)relative(\s|$)/);
    expect(circle.closest('[class*="absolute"]')).not.toBeNull();
  });

  it('shows the units of that product in the cart', () => {
    const tile = tileFor(4);

    expect(within(tile).getByText('4')).toBeInTheDocument();
    expect(tile).toHaveAttribute('aria-label', expect.stringContaining('4 di keranjang'));
  });

  it('shows no circle when the product is not in the cart', () => {
    const tile = tileFor(0);

    expect(within(tile).queryByText('0')).not.toBeInTheDocument();
    expect(tile.getAttribute('aria-label')).not.toMatch(/keranjang/);
  });
});
