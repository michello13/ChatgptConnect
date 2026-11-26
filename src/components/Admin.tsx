import { useState } from 'react';
import { ArrowLeft, Lock, Plus, Settings } from 'lucide-react';
import { shopApi } from '../api';
import type { Order, Product, ProductDraft } from '../types';
import { WishlistPanel } from './WishlistPanel';
import { ProductForm } from './ProductForm';
import { PhotoEditor } from './PhotoEditor';
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
  const [tab, setTab] = useState<'inventory' | 'orders' | 'wishes'>('wishes');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Product | null>(null);
  const [photoVersions, setPhotoVersions] = useState<Record<number, number>>({});
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

  const takenCount=orders.flatMap(order=>order.items).filter(item=>!item.isBackorder).reduce((sum,item)=>sum+item.quantity,0);

  return (
    <main className="page-content admin-page">
      <div className="section-heading">
        <h1>
          <Settings /> Box management
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
          <p>Enter your administrator password to continue.</p>
          <label htmlFor="admin-pin">Admin password</label>
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
              <strong>{orders.filter(o=>o.items.some(i=>!i.isBackorder)).length}</strong>
              <span>Recorded visits</span>
            </div>
            <div className="panel">
              <strong>{products.filter((product) => product.stock <= 5).length}</strong>
              <span>Low stock</span>
            </div>
            <div className="panel">
              <strong>{takenCount}</strong>
              <span>Items taken</span>
            </div>
          </div>
          <nav className="admin-tabs" aria-label="Admin sections">
            <button aria-pressed={tab==='wishes'} onClick={()=>setTab('wishes')}>Wishlist</button>
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
              History
            </button>
          </nav>
          {tab === 'wishes' ? <WishlistPanel/> : tab === 'inventory' ? (
            <>
              {editingPhoto ? (
                <PhotoEditor key={editingPhoto.id} product={editingPhoto} busy={busy}
                  onCancel={() => setEditingPhoto(null)}
                  onSave={(imageUrl) => perform(async () => {
                    const updated = await shopApi.setPhoto(editingPhoto.id, imageUrl);
                    setPhotoVersions(current => ({ ...current, [editingPhoto.id]: Date.now() }));
                    onProductsChange(updated);
                    setEditingPhoto(null);
                  })}
                />
              ) : addingProduct ? (
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
                      <ProductImage key={photoVersions[product.id] ?? 0} product={product} />
                    </div>
                    <div className="inventory-description">
                      <h2>{product.name}</h2>
                      <p>
                        {product.unit} · {product.stock} in stock
                      </p>
                      <button type="button" className="text-button" disabled={busy || addingProduct || editingPhoto !== null} onClick={() => setEditingPhoto(product)}>Change photo</button>
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
            <section className="orders-list" aria-label="Visit history">
              {!orders.length && <p className="empty-state">No visits recorded yet.</p>}
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
                            <small className="backorder-note"> · Wish</small>
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
