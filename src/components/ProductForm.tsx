import { useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { preparePhoto } from '../photo';
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
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [photoError, setPhotoError] = useState('');
  async function choosePhoto(file?: File) {
    if (!file || processing) return;
    setProcessing(true);
    setPhotoError('');
    try {
      update('imageUrl', await preparePhoto(file));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Unable to open the photo.');
    } finally {
      setProcessing(false);
    }
  }
  function update(field: keyof ProductDraft, value: string | number) {
    setDraft((current) => ({ ...current, [field]: value }));
  }
  return (
    <form
      className="panel product-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!processing && !busy) void onSave(draft);
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
      <label>Product photo (optional)</label>
      <div className="photo-picker">
        {draft.imageUrl && <img className="photo-preview" src={draft.imageUrl} alt="Product photo preview" />}
        <div className="photo-actions">
          <button type="button" disabled={busy || processing} onClick={() => camera.current?.click()}><Camera /> Take photo</button>
          <button type="button" disabled={busy || processing} onClick={() => gallery.current?.click()}><ImagePlus /> Choose photo</button>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden aria-label="Take product photo" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} />
        <input ref={gallery} type="file" accept="image/*" hidden aria-label="Choose product photo" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} />
        {processing && <p role="status">Preparing photo…</p>}
        {photoError && <p role="alert" className="error-message">{photoError}</p>}
        {draft.imageUrl && <button type="button" disabled={busy || processing} onClick={() => { update('imageUrl', ''); setPhotoError(''); }}>Remove photo</button>}
        <small>Photos are resized automatically. You can also add a product without a photo.</small>
      </div>
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
        <button className="primary" disabled={busy || processing || !draft.name.trim()}>
          {busy ? 'Saving…' : 'Add product'}
        </button>
      </div>
    </form>
  );
}
