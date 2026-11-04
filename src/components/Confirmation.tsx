import { CheckCircle } from 'lucide-react';
import type { Order } from '../types';

export function Confirmation({ order, onDone }: { order: Order; onDone: () => void }) {
  return (
    <main className="confirmation-page narrow-page">
      <CheckCircle className="confirmation-icon" />
      <h1>Thank you, {order.customerName}.</h1>
      <p>A little honesty goes a long way.</p>
      <div className="panel receipt">
        <h2>Order #{order.id}</h2>
        <ul>
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.isBackorder}`}>
              <span>
                {item.name}
                {item.isBackorder && <small> · Back-order requested</small>}
              </span>
              <span>×{item.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
      {order.items.some((item) => item.isBackorder) && (
        <p>
          Your back-order requests are saved for the owner. Ask at the box about availability; this
          app does not send notifications.
        </p>
      )}
      <p className="footnote">Please follow the payment instructions on the honesty box.</p>
      <button className="primary full-width" onClick={onDone}>
        Done
      </button>
    </main>
  );
}
