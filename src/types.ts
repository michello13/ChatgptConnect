export interface Product {
  id: number;
  name: string;
  description: string;
  stock: number;
  category: string;
  imageUrl: string;
  unit: string;
}

export type ProductDraft = Omit<Product, 'id'>;

export interface BasketItem {
  productId: number;
  quantity: number;
  isBackorder: boolean;
}

export interface Order {
  id: number;
  customerName: string;
  createdAt: string;
  items: (BasketItem & { name: string })[];
}

export type VisitMode = 'today' | 'wishes';
export type VisitReceipt = Pick<Order, 'customerName' | 'createdAt' | 'items'>;
export interface Wish {
  id: string;
  productId: number;
  name: string;
  quantity: number;
  customerName: string;
  createdAt: string;
  note: string;
  archivedAt: string | null;
}
