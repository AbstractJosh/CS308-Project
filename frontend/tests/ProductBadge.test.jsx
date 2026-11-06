import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductBadge from '../src/components/ProductBadge.jsx';

describe('ProductBadge', () => {
  it('shows SOLD OUT when stock is 0, even for a best seller', () => {
    render(<ProductBadge product={{ quantityInStock: 0, popularity: 200 }} />);
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
  });

  it('shows ONLY N LEFT from 1 to 5 in stock, even for a best seller', () => {
    const { rerender } = render(<ProductBadge product={{ quantityInStock: 1, popularity: 200 }} />);
    expect(screen.getByText('ONLY 1 LEFT')).toBeInTheDocument();
    rerender(<ProductBadge product={{ quantityInStock: 5, popularity: 0 }} />);
    expect(screen.getByText('ONLY 5 LEFT')).toBeInTheDocument();
  });

  it('shows BEST SELLER from popularity 150 when stock is above 5', () => {
    render(<ProductBadge product={{ quantityInStock: 6, popularity: 150 }} />);
    expect(screen.getByText('BEST SELLER')).toBeInTheDocument();
  });

  it('shows nothing when no rule matches', () => {
    const { container } = render(<ProductBadge product={{ quantityInStock: 6, popularity: 149 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
