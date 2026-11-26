import { useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { preparePhoto } from '../photo';
import type { Product } from '../types';

interface Props {
  product: Product;
  busy: boolean;
  onSave: (imageUrl: string) => Promise<void>;
  onCancel: () => void;
}

export function PhotoEditor({ product, busy, onSave, onCancel }: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  async function choose(file?: File) {
    if (!file || busy || processing) return;
    setProcessing(true);
    setError('');
    try { setPhoto(await preparePhoto(file)); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to open the photo.'); }
    finally { setProcessing(false); }
  }
  const preview = photo ?? product.imageUrl;
  return (
    <form className="panel product-form" onSubmit={event => {
      event.preventDefault();
      if (photo !== null && !processing && !busy) void onSave(photo);
    }}>
      <h2>Change photo — {product.name}</h2>
      <div className="photo-picker">
        {preview && <img className="photo-preview" src={preview} alt="Product photo preview" />}
        <div className="photo-actions">
          <button type="button" disabled={busy || processing} onClick={() => camera.current?.click()}><Camera /> Take photo</button>
          <button type="button" disabled={busy || processing} onClick={() => gallery.current?.click()}><ImagePlus /> Choose photo</button>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden aria-label="Take replacement photo" onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
        <input ref={gallery} type="file" accept="image/*" hidden aria-label="Choose replacement photo" onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
        {processing && <p role="status">Preparing photo…</p>}
        {error && <p role="alert" className="error-message">{error}</p>}
        {preview && <button type="button" disabled={busy || processing} onClick={() => { setPhoto(''); setError(''); }}>Remove photo</button>}
      </div>
      <div className="form-actions">
        <button type="button" disabled={busy || processing} onClick={onCancel}>Cancel</button>
        <button className="primary" disabled={busy || processing || photo === null}>{busy ? 'Saving…' : 'Save photo'}</button>
      </div>
    </form>
  );
}
