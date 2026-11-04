import { useState } from 'react';
import type { ProductDraft } from '../types';

interface Props {
  busy: boolean;
  onSave: (draft: ProductDraft) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ busy, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<ProductDraft>({
    name: '',
    description: '',
    category: '',
    unit: '',
    imageUrl: '',
    stock: 0,
  });
  function update(field: keyof ProductDraft, value: string | number) {
    setDraft((current) => ({ ...current, [field]: value }));
  }
  return (
    <form
      className="panel product-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(draft);
      }}
    >
      <h2>New product</h2>
      <label htmlFor="product-name">Name</label>
      <input
        id="product-name"
        required
        maxLength={200}
        value={draft.name}
        onChange={(event) => update('name', event.target.value)}
      />
      <label htmlFor="product-description">Description</label>
      <textarea
        id="product-description"
        maxLength={2000}
        rows={3}
        value={draft.description}
        onChange={(event) => update('description', event.target.value)}
      />
      <div className="form-columns">
        <div>
          <label htmlFor="product-category">Category</label>
          <input
            id="product-category"
            maxLength={80}
            placeholder="e.g. Pantry"
            value={draft.category}
            onChange={(event) => update('category', event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="product-unit">Unit</label>
          <input
            id="product-unit"
            maxLength={80}
            placeholder="e.g. 250g jar"
            value={draft.unit}
            onChange={(event) => update('unit', event.target.value)}
          />
        </div>
      </div>
      <label htmlFor="product-image">Image URL (optional)</label>
      <input
        id="product-image"
        type="url"
        maxLength={2000}
        placeholder="https://…"
        value={draft.imageUrl}
        onChange={(event) => update('imageUrl', event.target.value)}
      />
      <label htmlFor="product-stock">Starting stock</label>
      <input
        id="product-stock"
        type="number"
        required
        min={0}
        max={1000000}
        step={1}
        value={draft.stock}
        onChange={(event) => update('stock', Number(event.target.value))}
      />
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="primary" disabled={busy || !draft.name.trim()}>
          {busy ? 'Saving…' : 'Add product'}
        </button>
      </div>
    </form>
  );
}
