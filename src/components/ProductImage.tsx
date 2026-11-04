import { useState } from 'react';
import { Leaf } from 'lucide-react';
import type { Product } from '../types';

export function ProductImage({ product }: { product: Product }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!product.imageUrl || failedUrl === product.imageUrl) {
    return (
      <div className="image-placeholder" role="img" aria-label={product.name}>
        <Leaf aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      loading="lazy"
      onError={() => setFailedUrl(product.imageUrl)}
    />
  );
}
