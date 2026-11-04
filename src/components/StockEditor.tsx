import { useEffect, useState } from 'react';
import type { Product } from '../types';

interface Props {
  product: Product;
  busy: boolean;
  onSave: (stock: number) => Promise<void>;
}

export function StockEditor({ product, busy, onSave }: Props) {
  const [value, setValue] = useState(String(product.stock));
  useEffect(() => setValue(String(product.stock)), [product.stock]);
  return (
    <form
      className="stock-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(Number(value));
      }}
    >
      <label className="sr-only" htmlFor={`stock-${product.id}`}>
        Stock for {product.name}
      </label>
      <input
        id={`stock-${product.id}`}
        type="number"
        min={0}
        max={1000000}
        step={1}
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button disabled={busy || value === '' || Number(value) === product.stock}>Save</button>
    </form>
  );
}
