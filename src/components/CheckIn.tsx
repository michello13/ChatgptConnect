import { useState } from 'react';
import { ChevronRight, Leaf } from 'lucide-react';
import { Brand } from './Brand';

interface Props {
  onCheckIn: (name: string) => void;
  onAdmin: () => void;
}

export function CheckIn({ onCheckIn, onAdmin }: Props) {
  const [name, setName] = useState('');
  return (
    <div className="welcome-page">
      <main className="welcome-content">
        <Brand large />
        <div className="botanical-divider">
          <Leaf aria-hidden="true" />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) onCheckIn(name.trim());
          }}
        >
          <label htmlFor="customer-name">Enter your name to browse</label>
          <input
            id="customer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your first name"
            maxLength={100}
            autoComplete="given-name"
            required
            autoFocus
          />
          <button className="primary full-width" disabled={!name.trim()}>
            Browse Products <ChevronRight />
          </button>
        </form>
        <p className="footnote">Scan the QR code on the honesty box to open this page</p>
      </main>
      <footer className="welcome-footer">
        <button className="text-button" onClick={onAdmin}>
          Admin
        </button>
      </footer>
    </div>
  );
}
