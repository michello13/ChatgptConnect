import { useEffect, useRef, useState } from 'react';
import { shopApi } from '../api';
import type { BasketItem, VisitReceipt, VisitMode, Product } from '../types';
import { Admin } from '../components/Admin';
import { Basket } from '../components/Basket';
import { Catalog } from '../components/Catalog';
import { CheckIn } from '../components/CheckIn';
import { Confirmation } from '../components/Confirmation';

type Screen = 'checkin' | 'catalog' | 'basket' | 'confirmation' | 'admin';

export default function App() {
  const [mode,setMode]=useState<VisitMode>('today');
  const [note,setNote]=useState('');
  const [announcement,setAnnouncement]=useState('');
  const [screen, setScreen] = useState<Screen>('checkin');
  const [customerName, setCustomerName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [lastOrder, setLastOrder] = useState<VisitReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const orderInFlight = useRef(false);

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      setProducts(await shopApi.products());
    } catch {
      setError('The box couldn't be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadProducts();
    void shopApi.announcement().then(r=>setAnnouncement(r.message)).catch(()=>{});
  }, []);

  function changeQuantity(product: Product, quantity: number, isBackorder: boolean) {
    if (orderInFlight.current) return;
    const maximum = isBackorder ? 999 : product.stock;
    const boundedQuantity = Math.max(0, Math.min(quantity, maximum));
    setBasket((current) => {
      const otherItems = current.filter(
        (item) => !(item.productId === product.id && item.isBackorder === isBackorder),
      );
      return boundedQuantity === 0
        ? otherItems
        : [...otherItems, { productId: product.id, quantity: boundedQuantity, isBackorder }];
    });
  }

  async function confirmOrder() {
    const selected=basket.filter(i=>i.isBackorder===(mode==='wishes'));
    if (orderInFlight.current || selected.length === 0) return;
    orderInFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      if(mode==='wishes'){
        setLastOrder(await shopApi.sendWishes(customerName,selected,note));
        setNote('');
      } else {
        const result=await shopApi.placeOrder(customerName,selected);
        setProducts(result.products);
        setLastOrder(result.order);
      }
      setBasket(current=>current.filter(i=>i.isBackorder!==(mode==='wishes')));
      setScreen('confirmation');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not save your selection. Please try again.',
      );
      // Keep the basket so the customer can correct stock conflicts without starting again.
      try {
        setProducts(await shopApi.products());
      } catch {
        /* Preserve the original checkout error. */
      }
    } finally {
      orderInFlight.current = false;
      setSubmitting(false);
    }
  }

  function returnToCheckIn() {
    if(basket.length && !window.confirm('Leave without saving your remaining selection?')) return;
    setNote('');
    setCustomerName('');
    setBasket([]);
    setError('');
    setScreen('checkin');
  }

  return (
    <>
      {error && (
        <div className="error-banner" role="alert">
          {error}{' '}
          <button
            onClick={() => {
              void loadProducts();
            }}
          >
            Refresh products
          </button>
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}
      {loading ? (
        <main className="loading-state" role="status">
          Opening the honesty box…
        </main>
      ) : (
        <>
          {screen === 'checkin' && (
            <CheckIn
              announcement={announcement}
              onCheckIn={(name, nextMode) => {
                setMode(nextMode);
                setCustomerName(name);
                setScreen('catalog');
                void loadProducts();
              }}
              onAdmin={() => setScreen('admin')}
            />
          )}
          {screen === 'catalog' && (
            <Catalog
              products={products}
              basket={basket}
              customerName={customerName}
              mode={mode}
              onModeChange={setMode}
              onQuantityChange={changeQuantity}
              onViewBasket={() => setScreen('basket')}
              onLeave={returnToCheckIn}
            />
          )}
          {screen === 'basket' && (
            <Basket
              products={products}
              items={basket.filter(i=>i.isBackorder===(mode==='wishes'))}
              mode={mode}
              note={note}
              onNoteChange={setNote}
              customerName={customerName}
              busy={submitting}
              onQuantityChange={changeQuantity}
              onBack={() => setScreen('catalog')}
              onConfirm={() => {
                void confirmOrder();
              }}
            />
          )}
          {screen === 'confirmation' && lastOrder && (
            <Confirmation order={lastOrder} mode={mode} pendingOther={basket.length>0} onContinue={()=>{setMode(mode==='today'?'wishes':'today');setScreen('catalog');}} onDone={returnToCheckIn} />
          )}
          {screen === 'admin' && (
            <Admin products={products} onProductsChange={setProducts} onExit={()=>{returnToCheckIn();void shopApi.announcement().then(r=>setAnnouncement(r.message)).catch(()=>{});}} />
          )}
        </>
      )}
    </>
  );
}
