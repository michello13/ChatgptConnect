import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react';
import type { BasketItem, Product } from '../types';
import { ProductImage } from './ProductImage';
import { QuantityControl } from './QuantityControl';

interface Props {
  products: Product[];
  items: BasketItem[];
  customerName: string;
  busy: boolean;
  onQuantityChange: (product: Product, quantity: number, isBackorder: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function Basket({
  products,
  items,
  customerName,
  busy,
  onQuantityChange,
  onBack,
  onConfirm,
}: Props) {
  return (
    <main className="page-content narrow-page">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft /> Back to products
      </button>
      <h1>Your Basket</h1>
      <p>For {customerName}. Take what you need, leave a little trust.</p>
      {!items.length && <p className="empty-state">Your basket is empty.</p>}
      {[false, true].map((isBackorder) => {
        const group = items.filter((item) => item.isBackorder === isBackorder);
        if (!group.length) return null;
        return (
          <section className="basket-section" key={String(isBackorder)}>
            <h2>{isBackorder ? 'Back-order requests' : 'Available now'}</h2>
            {isBackorder && (
              <p>These items are out of stock. Your request will be recorded for the owner.</p>
            )}
            {group.map((item) => {
              const product = products.find((product) => product.id === item.productId);
              if (!product) return null;
              return (
                <article className="basket-row panel" key={item.productId}>
                  <div className="basket-photo">
                    <ProductImage product={product} />
                  </div>
                  <div className="basket-description">
                    <h3>{product.name}</h3>
                    <small>{product.unit}</small>
                    <QuantityControl
                      name={product.name}
                      quantity={item.quantity}
                      maximum={isBackorder ? 999 : product.stock}
                      onChange={(value) => onQuantityChange(product, value, isBackorder)}
                    />
                  </div>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`Remove ${product.name} from basket`}
                    onClick={() => onQuantityChange(product, 0, isBackorder)}
                  >
                    <Trash2 />
                  </button>
                </article>
              );
            })}
          </section>
        );
      })}
      {items.length > 0 && (
        <div className="checkout-actions">
          <button className="primary full-width" disabled={busy} onClick={onConfirm}>
            <CheckCircle /> {busy ? 'Saving your order…' : 'Confirm & Take'}
          </button>
          <p className="footnote">
            No online payment. Follow the payment instructions on the physical box.
          </p>
        </div>
      )}
    </main>
  );
}
