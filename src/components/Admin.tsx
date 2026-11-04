import { useState } from 'react';
import { ArrowLeft, Lock, Plus, Settings } from 'lucide-react';
import { shopApi } from '../api';
import type { Order, Product, ProductDraft } from '../types';
import { ProductForm } from './ProductForm';
import { ProductImage } from './ProductImage';
import { StockEditor } from './StockEditor';

interface Props {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
  onExit: () => void;
}

export function Admin({ products, onProductsChange, onExit }: Props) {
  const [signedIn, setSignedIn] = useState(false);
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState<'inventory' | 'orders'>('inventory');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addingProduct, setAddingProduct] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    await perform(async () => {
      await shopApi.login(pin);
      const [latestOrders, latestProducts] = await Promise.all([
        shopApi.orders(),
        shopApi.products(),
      ]);
      setOrders(latestOrders);
      onProductsChange(latestProducts);
      setSignedIn(true);
      setPin('');
    });
  }

  async function addProduct(draft: ProductDraft) {
    await perform(async () => {
      const product = await shopApi.addProduct(draft);
      onProductsChange([...products, product]);
      setAddingProduct(false);
    });
  }

  const backorderCount = orders
    .flatMap((order) => order.items)
    .filter((item) => item.isBackorder)
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="page-content admin-page">
      <div className="section-heading">
        <h1>
          <Settings /> Admin Panel
        </h1>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            if (!signedIn) {
              onExit();
              return;
            }
            void perform(async () => {
              await shopApi.logout();
              onExit();
            });
          }}
        >
          <ArrowLeft /> Exit
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!signedIn ? (
        <form
          className="panel login-form"
          onSubmit={(event) => {
            event.preventDefault();
            void login();
          }}
        >
          <Lock />
          <h2>Admin Access</h2>
          <p>Enter your PIN to continue.</p>
          <label htmlFor="admin-pin">Admin PIN</label>
          <input
            id="admin-pin"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            autoFocus
          />
          <button className="primary full-width" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <>
          <div className="stats-grid">
            <div className="panel">
              <strong>{orders.length}</strong>
              <span>Orders</span>
            </div>
            <div className="panel">
              <strong>{products.filter((product) => product.stock <= 5).length}</strong>
              <span>Low stock</span>
            </div>
            <div className="panel">
              <strong>{backorderCount}</strong>
              <span>Requested</span>
            </div>
          </div>
          <nav className="admin-tabs" aria-label="Admin sections">
            <button aria-pressed={tab === 'inventory'} onClick={() => setTab('inventory')}>
              Inventory
            </button>
            <button
              aria-pressed={tab === 'orders'}
              onClick={() => {
                setTab('orders');
                void perform(async () => setOrders(await shopApi.orders()));
              }}
            >
              Orders
            </button>
          </nav>
          {tab === 'inventory' ? (
            <>
              {addingProduct ? (
                <ProductForm
                  busy={busy}
                  onSave={addProduct}
                  onCancel={() => setAddingProduct(false)}
                />
              ) : (
                <button className="add-product" onClick={() => setAddingProduct(true)}>
                  <Plus /> Add new product
                </button>
              )}
              <div className="inventory-list">
                {products.map((product) => (
                  <article className="panel inventory-row" key={product.id}>
                    <div className="basket-photo">
                      <ProductImage product={product} />
                    </div>
                    <div className="inventory-description">
                      <h2>{product.name}</h2>
                      <p>
                        {product.unit} · {product.stock} in stock
                      </p>
                    </div>
                    <StockEditor
                      product={product}
                      busy={busy}
                      onSave={(stock) =>
                        perform(async () =>
                          onProductsChange(await shopApi.setStock(product.id, stock)),
                        )
                      }
                    />
                  </article>
                ))}
              </div>
            </>
          ) : (
            <section className="orders-list" aria-label="Customer orders">
              {!orders.length && <p className="empty-state">No orders yet.</p>}
              {orders.map((order) => (
                <article className="panel" key={order.id}>
                  <h2>
                    {order.customerName} <small>#{order.id}</small>
                  </h2>
                  <time dateTime={order.createdAt}>
                    {new Date(order.createdAt).toLocaleString()}
                  </time>
                  <ul className="order-items">
                    {order.items.map((item) => (
                      <li key={`${item.productId}-${item.isBackorder}`}>
                        <span>
                          {item.name}
                          {item.isBackorder && (
                            <small className="backorder-note"> · Back-order request</small>
                          )}
                        </span>
                        <span>×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
