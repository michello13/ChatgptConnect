import type { BasketItem, Order, Product, ProductDraft } from './types';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed. Please try again.');
  return body as T;
}

// Keep HTTP details here. Components work with products and orders.
export const shopApi = {
  products: () => api<Product[]>('/products'),
  placeOrder: (customerName: string, items: BasketItem[]) =>
    api<{ order: Order; products: Product[] }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ customerName, items }),
    }),
  login: (pin: string) => api('/admin/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  logout: () => api('/admin/logout', { method: 'POST', body: '{}' }),
  orders: () => api<Order[]>('/admin/orders'),
  addProduct: (product: ProductDraft) =>
    api<Product>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  setStock: (id: number, stock: number) =>
    api<Product[]>(`/admin/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    }),
};
