import { useState } from 'react';
import { Clock, ShoppingBasket } from 'lucide-react';
import type { BasketItem, Product } from '../types';
import { Brand } from './Brand';
import { ProductImage } from './ProductImage';
import { QuantityControl } from './QuantityControl';

interface Props {
  products: Product[];
  basket: BasketItem[];
  customerName: string;
  onQuantityChange: (product: Product, quantity: number) => void;
  onViewBasket: () => void;
  onLeave: () => void;
}

export function Catalog({
  products,
  basket,
  customerName,
  onQuantityChange,
  onViewBasket,
  onLeave,
}: Props) {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(products.map((product) => product.category))];
  const visibleProducts = products.filter(
    (product) => category === 'All' || product.category === category,
  );
  const count = basket.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="site-header">
        <div className="header-content">
          <Brand />
          <div className="header-actions">
            <span className="greeting">Hi, {customerName}</span>
            <button className="primary" onClick={onViewBasket}>
              <ShoppingBasket /> Basket ({count})
            </button>
          </div>
        </div>
        <nav className="category-tabs" aria-label="Product categories">
          {categories.map((name) => (
            <button key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>
              {name}
            </button>
          ))}
        </nav>
      </header>
      <main className="page-content catalog-content">
        <div className="section-heading">
          <h1>From the honesty box</h1>
          <button className="text-button" onClick={onLeave}>
            Change name
          </button>
        </div>
        <div className="product-grid">
          {visibleProducts.map((product) => {
            const quantity = basket.find((item) => item.productId === product.id)?.quantity ?? 0;
            const outOfStock = product.stock === 0;
            return (
              <article className="product-card" key={product.id}>
                <div className="product-photo">
                  <ProductImage product={product} />
                  {product.stock <= 5 && (
                    <span className={`stock-badge ${outOfStock ? 'unavailable' : ''}`}>
                      {outOfStock ? 'Out of stock' : `${product.stock} left`}
                    </span>
                  )}
                </div>
                <div className="product-details">
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                  <div className="product-meta">
                    <span>{product.unit}</span>
                    <span>{product.stock} in stock</span>
                  </div>
                  {outOfStock && (
                    <small className="backorder-note">
                      <Clock /> Request for a future visit
                    </small>
                  )}
                  <QuantityControl
                    name={product.name}
                    quantity={quantity}
                    maximum={outOfStock ? 999 : product.stock}
                    onChange={(value) => onQuantityChange(product, value)}
                  />
                </div>
              </article>
            );
          })}
        </div>
        {!visibleProducts.length && (
          <p className="empty-state">No products in this category yet.</p>
        )}
      </main>
      {count > 0 && (
        <footer className="basket-bar">
          <button className="primary full-width" onClick={onViewBasket}>
            <ShoppingBasket /> View Basket · {count} {count === 1 ? 'item' : 'items'}
          </button>
        </footer>
      )}
    </>
  );
}
