import { Leaf } from 'lucide-react';

export function Brand({ large = false }: { large?: boolean }) {
  if (!large)
    return (
      <span className="brand">
        <Leaf aria-hidden="true" /> Honesty Box
      </span>
    );
  return (
    <div className="brand-intro">
      <div className="brand-mark">
        <Leaf aria-hidden="true" />
        <span>✦</span>
      </div>
      <h1>The Honesty Box</h1>
      <p>
        Small-batch, foraged &amp; artisan goods.
        <br />
        Take what you need, pay with trust.
      </p>
    </div>
  );
}
