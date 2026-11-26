import { useState } from 'react';
import { ChevronRight, Heart, Leaf, Settings } from 'lucide-react';
import { Brand } from './Brand';
import type { VisitMode } from '../types';

interface Props {
  onCheckIn: (name: string, mode: VisitMode) => void;
  onAdmin: () => void;
  announcement: string;
}
export function CheckIn({ onCheckIn, onAdmin, announcement }: Props) {
  const [name, setName] = useState('');
  return (
    <div className="welcome-page">
      <main className="welcome-content">
        <section className="welcome-brand"><Brand large /></section>
        <section className="welcome-checkin">
          <h2>Welcome to the box</h2>
          {announcement && <aside className="home-note"><Heart aria-hidden="true" /><div><strong>A little note from home</strong><p>{announcement}</p></div></aside>}
          <div className="botanical-divider"><Leaf aria-hidden="true" /></div>
          <form onSubmit={event => {event.preventDefault(); if(name.trim()) onCheckIn(name.trim(),'today');}}>
            <label htmlFor="customer-name">What's your name?</label>
            <input id="customer-name" value={name} onChange={event=>setName(event.target.value)} placeholder="Your first name" maxLength={100} autoComplete="off" required />
            <button className="primary full-width" disabled={!name.trim()}>See what's available <ChevronRight /></button>
            <button type="button" className="full-width wish-button" disabled={!name.trim()} onClick={()=>onCheckIn(name.trim(),'wishes')}><Heart /> Missing your favourite?</button>
          </form>
        </section>
      </main>
      <footer className="welcome-footer"><button type="button" className="admin-entry" onClick={onAdmin}><Settings aria-hidden="true" /> Admin</button></footer>
    </div>
  );
}
