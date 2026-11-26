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
        Homemade, homegrown &amp; shared with love.
      </p>
    </div>
  );
}
