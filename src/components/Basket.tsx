import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react';
import type { BasketItem, Product, VisitMode } from '../types';
import { ProductImage } from './ProductImage';
import { QuantityControl } from './QuantityControl';
interface Props {
  products: Product[]; items: BasketItem[]; customerName: string; busy: boolean;
  mode: VisitMode; note: string; onNoteChange: (note:string)=>void;
  onQuantityChange: (product:Product,quantity:number,isBackorder:boolean)=>void;
  onBack:()=>void; onConfirm:()=>void;
}
export function Basket({products,items,customerName,busy,mode,note,onNoteChange,onQuantityChange,onBack,onConfirm}:Props) {
  const wishing=mode==='wishes';
  return <main className="page-content narrow-page">
    <button className="text-button" disabled={busy} onClick={onBack}><ArrowLeft/> Back to {wishing?'wishlist':'the box'}</button>
    <h1>{wishing?'Your wishes':"What you're taking"}</h1>
    <p>{customerName}, {wishing?"these wishes help me decide what to make next. Availability is never guaranteed.":"check that these match what you're taking from the box."}</p>
    {!items.length&&<p className="empty-state">Nothing selected yet.</p>}
    <section className="basket-section">
      {items.map(item=>{
        const product=products.find(p=>p.id===item.productId);
        if(!product)return <p key={item.productId} role="alert">An item is no longer listed. Please remove it by ending this visit.</p>;
        return <article className="basket-row panel" key={item.productId}>
          <div className="basket-photo"><ProductImage product={product}/></div>
          <div className="basket-description"><h3>{product.name}</h3><small>{product.unit}</small>
            <QuantityControl name={product.name} quantity={item.quantity} maximum={wishing?999:product.stock} disabled={busy} onChange={v=>onQuantityChange(product,v,wishing)}/>
          </div>
          <button className="icon-button" disabled={busy} aria-label={'Remove '+product.name} onClick={()=>onQuantityChange(product,0,wishing)}><Trash2/></button>
        </article>;
      })}
    </section>
    {wishing&&items.length>0&&<div className="panel"><label htmlFor="wish-note">A little note (optional)</label><textarea id="wish-note" maxLength={500} rows={3} disabled={busy} value={note} onChange={e=>onNoteChange(e.target.value)} placeholder="Anything you'd like me to know?"/><small>{note.length}/500</small></div>}
    {items.length>0&&<div className="checkout-actions"><button className="primary full-width" disabled={busy||items.some(i=>!products.some(p=>p.id===i.productId))} onClick={onConfirm}><CheckCircle/> {busy?'Saving…':wishing?'Send my wishes':"Confirm what I'm taking"}</button></div>}
  </main>;
}
