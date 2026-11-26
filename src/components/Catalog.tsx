import { useState } from 'react';
import { Heart, ShoppingBasket } from 'lucide-react';
import type { BasketItem, Product, VisitMode } from '../types';
import { Brand } from './Brand';
import { ProductImage } from './ProductImage';
import { QuantityControl } from './QuantityControl';

interface Props {
  products: Product[];
  basket: BasketItem[];
  customerName: string;
  mode: VisitMode;
  onModeChange: (mode: VisitMode) => void;
  onQuantityChange: (product: Product, quantity: number, isBackorder: boolean) => void;
  onViewBasket: () => void;
  onLeave: () => void;
}
export function Catalog({products,basket,customerName,mode,onModeChange,onQuantityChange,onViewBasket,onLeave}:Props) {
  const [category,setCategory]=useState('All');
  const wishing=mode==='wishes';
  const pool=products.filter(p=>wishing || p.stock>0);
  const categories=['All',...new Set(pool.map(p=>p.category))].filter((v,i,a)=>a.indexOf(v)===i);
  const visible=pool.filter(p=>category==='All'||p.category===category);
  const count=(wish:boolean)=>basket.filter(i=>i.isBackorder===wish).reduce((sum,i)=>sum+i.quantity,0);
  const activeCount=count(wishing);
  function switchMode(next:VisitMode){setCategory('All');onModeChange(next);}
  return <>
    <header className="site-header">
      <div className="header-content"><Brand /><button className="text-button" onClick={onLeave}>End visit</button></div>
      <nav className="journey-tabs" aria-label="Choose what to do">
        <button aria-pressed={!wishing} onClick={()=>switchMode('today')}><ShoppingBasket/> In the box {count(false)>0 && '('+count(false)+')'}</button>
        <button aria-pressed={wishing} onClick={()=>switchMode('wishes')}><Heart/> Wishlist {count(true)>0 && '('+count(true)+')'}</button>
      </nav>
      {categories.length>2 && <nav className="category-tabs" aria-label="Product categories">{categories.map(name=><button key={name} aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</nav>}
    </header>
    <main className="page-content catalog-content">
      <h1>{wishing?"What would you love to see again?":"Inside the box"}</h1>
      <p className="catalog-intro">Hi, {customerName}! {wishing?"Tell me what you'd enjoy in a future batch. Wishes are not reservations or promises.":"Choose the quantities you're taking today."}</p>
      <div className="product-grid">
        {visible.map(product=>{
          const quantity=basket.find(i=>i.productId===product.id&&i.isBackorder===wishing)?.quantity??0;
          return <article className="product-card" key={product.id}>
            <div className="product-photo"><ProductImage product={product}/>{!wishing && <span className="stock-badge available">{product.stock} left</span>}</div>
            <div className="product-details">
              <h2>{product.name}</h2><p>{product.description}</p>
              <div className="product-meta"><span>{product.unit}</span>{wishing&&<span>{product.stock>0?'Also available today':'Not in the box today'}</span>}</div>
              {wishing&&quantity===0?<button className="wish-button" onClick={()=>onQuantityChange(product,1,true)}><Heart/> I'd love some</button>:<QuantityControl name={product.name} quantity={quantity} maximum={wishing?999:product.stock} onChange={v=>onQuantityChange(product,v,wishing)}/>}
            </div>
          </article>;
        })}
      </div>
      {!visible.length&&<div className="empty-state"><p>{wishing?'No familiar products listed yet.':'Nothing available here right now.'}</p>{!wishing&&<button className="wish-button" onClick={()=>switchMode('wishes')}><Heart/> Tell me what you miss</button>}</div>}
      {!wishing&&products.length>0&&<aside className="wishlist-invite"><Heart/><div><strong>Missing your favourite?</strong><p>Tell me what you'd like to see again.</p></div><button onClick={()=>switchMode('wishes')}>Wishlist</button></aside>}
    </main>
    {activeCount>0&&<footer className="basket-bar"><button className="primary full-width" onClick={onViewBasket}>{wishing?<Heart/>:<ShoppingBasket/>} {wishing?'Review wishes':'Review what I’m taking'} · {activeCount}</button></footer>}
  </>;
}
