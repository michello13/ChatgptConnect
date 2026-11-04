import { Minus, Plus } from 'lucide-react';

interface Props {
  name: string;
  quantity: number;
  maximum: number;
  onChange: (quantity: number) => void;
}

export function QuantityControl({ name, quantity, maximum, onChange }: Props) {
  return (
    <div className="quantity-control">
      <button
        className="icon-button"
        aria-label={`Remove one ${name}`}
        disabled={quantity === 0}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus />
      </button>
      <span aria-label={`Quantity of ${name}`}>{quantity}</span>
      <button
        className="icon-button primary"
        aria-label={`Add one ${name}`}
        disabled={quantity >= maximum}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus />
      </button>
    </div>
  );
}
