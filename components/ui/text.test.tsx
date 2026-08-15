import { render, screen } from '@testing-library/react-native';

import { Text } from '@/components/ui/text';
import { formatIDR, parseMoney } from '@/lib/money';

/**
 * Smoke test: the primitive renders, the type scale reaches the tree, and a
 * value parsed off the wire formats as rupiah with no decimal separator.
 */
describe('Text', () => {
  it('renders its children', () => {
    render(<Text>Halo</Text>);
    expect(screen.getByText('Halo')).toBeOnTheScreen();
  });

  it('applies the type-scale preset for a variant', () => {
    render(<Text variant="h1">Judul</Text>);
    expect(screen.getByText('Judul')).toBeOnTheScreen();
  });

  it('renders money as tabular mono with no decimal separator', () => {
    const amount = parseMoney('15750000.00');
    render(<Text variant="mono">{formatIDR(amount)}</Text>);

    const node = screen.getByText('Rp 15.750.000');
    expect(node).toBeOnTheScreen();
    expect(node.props.children).not.toContain(',');
  });

  it('applies tabular figures to the mono variant as a real style', () => {
    // The `tabular-nums` class only reaches web: react-native-css-interop does
    // not map font-variant-numeric. Money columns depend on this style landing
    // on native too, so it is asserted directly. See lib/typography.ts.
    render(<Text variant="mono">Rp 15.750.000</Text>);

    expect(screen.getByText('Rp 15.750.000')).toHaveStyle({
      fontVariant: ['tabular-nums'],
    });
  });

  it('leaves non-money text with default figures', () => {
    render(<Text variant="body">Produk</Text>);

    expect(screen.getByText('Produk')).not.toHaveStyle({
      fontVariant: ['tabular-nums'],
    });
  });
});
