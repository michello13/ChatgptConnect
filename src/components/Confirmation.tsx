import { CheckCircle, Heart, ShoppingBasket } from 'lucide-react';
import type { VisitReceipt, VisitMode } from '../types';
export function Confirmation({order,mode,pendingOther,onContinue,onDone}:{order:VisitReceipt;mode:VisitMode;pendingOther:boolean;onContinue:()=>void;onDone:()=>void}) {
  const wishing=mode==='wishes';
  return <main className="confirmation-page narrow-page">
    <CheckCircle className="confirmation-icon"/>
    <h1>Thank you, {order.customerName}!</h1>
    <p>{wishing?"Your wishes have been noted. I'll keep them in mind for future batches.":"What you're taking has been recorded. Enjoy your goodies!"}</p>
    <div className="panel receipt"><h2>{wishing?'Wishes shared':'Items taken'}</h2><ul>{order.items.map(item=><li key={item.productId}><span>{item.name}</span><span>×{item.quantity}</span></li>)}</ul></div>
    {wishing&&<p className="footnote">A wish is not a reservation or guarantee of availability.</p>}
    {pendingOther&&<p>You still have an unsaved {wishing?'selection of items to take':'wishlist'}.</p>}
    <button className={pendingOther?'primary full-width':'full-width wish-button'} onClick={onContinue}>{wishing?<ShoppingBasket/>:<Heart/>}{wishing?'See what’s in the box':'Share a wish'}</button>
    <button className={pendingOther?'full-width':'primary full-width'} onClick={onDone}>All done</button>
    <p className="footnote">Made with care. Shared with trust.</p>
  </main>;
}
