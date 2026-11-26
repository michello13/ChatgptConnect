import { useRef, useState } from 'react';
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
  const [nameError, setNameError] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  function continueVisit(mode: VisitMode) {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      nameInput.current?.focus();
      return;
    }
    setNameError(false);
    onCheckIn(trimmed, mode);
  }
  return (
    <div className="welcome-page">
      <main className="welcome-content">
        <section className="welcome-brand"><Brand large /></section>
        <section className="welcome-checkin">
          <h2>Welcome to the box</h2>
          {announcement && <aside className="home-note"><Heart aria-hidden="true" /><div><strong>A little note from home</strong><p>{announcement}</p></div></aside>}
          <div className="botanical-divider"><Leaf aria-hidden="true" /></div>
          <form noValidate onSubmit={event => {event.preventDefault(); continueVisit('today');}}>
            <label htmlFor="customer-name">What's your name?</label>
            <input
              ref={nameInput}
              id="customer-name"
              value={name}
              onChange={event => {
                setName(event.target.value);
                if (event.target.value.trim()) setNameError(false);
              }}
              placeholder="Your first name"
              maxLength={100}
              autoComplete="off"
              required
              aria-invalid={nameError}
              aria-describedby={nameError ? 'customer-name-error' : undefined}
            />
            {nameError && <p id="customer-name-error" className="name-validation" role="alert">Please enter your first name to continue.</p>}
            <button type="submit" className="primary full-width">See what's available <ChevronRight /></button>
            <button type="button" className="full-width wish-button" onClick={()=>continueVisit('wishes')}><Heart /> Missing your favourite?</button>
          </form>
        </section>
      </main>
      <footer className="welcome-footer"><button type="button" className="admin-entry" onClick={onAdmin}><Settings aria-hidden="true" /> Admin</button></footer>
    </div>
  );
}
