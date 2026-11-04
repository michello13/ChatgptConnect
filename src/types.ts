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
