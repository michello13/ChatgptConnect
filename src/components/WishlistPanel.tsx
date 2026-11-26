import { useEffect, useState } from 'react';
import { Archive, Heart, RefreshCw } from 'lucide-react';
import { shopApi } from '../api';
import type { Wish } from '../types';
type Filter='week'|'all'|'archive';
export function WishlistPanel() {
  const [wishes,setWishes]=useState<Wish[]>([]);
  const [message,setMessage]=useState('');
  const [filter,setFilter]=useState<Filter>('week');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [feedback,setFeedback]=useState('');
  async function run(action:()=>Promise<void>){
    setBusy(true);setError('');setFeedback('');
    try{await action();}catch(e){setError(e instanceof Error?e.message:'Could not save. Try again.');}finally{setBusy(false);}
  }
  function load(){void run(async()=>{const [w,m]=await Promise.all([shopApi.wishes(),shopApi.announcement()]);setWishes(w);setMessage(m.message);});}
  useEffect(()=>{load();},[]);
  const cutoff=Date.now()-7*24*60*60*1000;
  const visible=wishes.filter(w=>filter==='archive'?!!w.archivedAt:!w.archivedAt&&(filter==='all'||Date.parse(w.createdAt)>=cutoff));
  const groups=new Map<number,Wish[]>();
  visible.forEach(w=>groups.set(w.productId,[...(groups.get(w.productId)??[]),w]));
  const sorted=[...groups.values()].sort((a,b)=>b.reduce((s,w)=>s+w.quantity,0)-a.reduce((s,w)=>s+w.quantity,0));
  return <section className="wishlist-admin">
    <div className="section-heading"><h2><Heart/> Neighbourhood wishes</h2><button disabled={busy} onClick={load}><RefreshCw/> Refresh</button></div>
    <p>A little inspiration for future batches. Nothing here is an obligation.</p>
    {error&&<p className="error-message" role="alert">{error}</p>}
    {feedback&&<p role="status">{feedback}</p>}
    <nav className="admin-tabs wish-filters" aria-label="Wishlist history">
      <button aria-pressed={filter==='week'} onClick={()=>setFilter('week')}>Last 7 days</button>
      <button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All recent</button>
      <button aria-pressed={filter==='archive'} onClick={()=>setFilter('archive')}>Archived</button>
    </nav>
    <div className="stats-grid wish-stats"><div className="panel"><strong>{visible.length}</strong><span>Wishes</span></div><div className="panel"><strong>{groups.size}</strong><span>Products</span></div><div className="panel"><strong>{visible.reduce((s,w)=>s+w.quantity,0)}</strong><span>Desired units</span></div></div>
    {busy&&!wishes.length&&<p role="status">Loading wishes…</p>}
    {!busy&&!visible.length&&<p className="empty-state">No wishes in this view yet.</p>}
    <div className="orders-list">{sorted.map(group=><article className="panel" key={group[0].productId}>
      <h2>{group[0].name}</h2><p>{group.length} wishes · {group.reduce((s,w)=>s+w.quantity,0)} desired units</p>
      {group.map(w=><div className="wish-history-row" key={w.id}><div><strong>{w.customerName} · ×{w.quantity}</strong><br/><time dateTime={w.createdAt}>{new Date(w.createdAt).toLocaleString('en-GB',{timeZone:'Europe/Brussels'})}</time>{w.note&&<p>{w.note}</p>}</div>
        {!w.archivedAt&&<button disabled={busy} onClick={()=>void run(async()=>{setWishes(await shopApi.archiveWish(w.id));setFeedback('Wish archived. It remains in history.');})}><Archive/> Archive</button>}
      </div>)}
    </article>)}</div>
    <form className="panel announcement-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await shopApi.setAnnouncement(message);setMessage(r.message);setFeedback('Your note is saved.');});}}>
      <h2>A little note from home</h2><p>Share a message on the welcome screen. Leave it empty to hide it.</p>
      <label htmlFor="home-message">Message for neighbours</label><textarea id="home-message" rows={3} maxLength={500} value={message} disabled={busy} onChange={e=>setMessage(e.target.value)}/>
      <button className="primary full-width" disabled={busy}>Save message</button>
    </form>
  </section>;
}
