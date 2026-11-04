import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedProducts } from './seed.mjs';

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function text(value, label, max = 200, optional = false) {
  if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) {
    throw new AppError(
      400,
      `${label} must be ${optional ? 'at most' : 'between 1 and'} ${max} characters.`,
    );
  }
  return value.trim();
}
export function integer(value, label, min = 0, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new AppError(400, `${label} must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      stock INTEGER NOT NULL CHECK(stock >= 0), category TEXT NOT NULL,
      imageUrl TEXT NOT NULL, unit TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY, customerName TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      orderId INTEGER NOT NULL REFERENCES orders(id), productId INTEGER NOT NULL REFERENCES products(id),
      name TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0),
      isBackorder INTEGER NOT NULL CHECK(isBackorder IN (0,1)),
      PRIMARY KEY (orderId, productId, isBackorder)
    );`);
  if (!db.prepare('SELECT COUNT(*) AS n FROM products').get().n) {
    const insert = db.prepare('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?)');
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const p of seedProducts)
        insert.run(p.id, p.name, p.description, p.stock, p.category, p.imageUrl, p.unit);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  const products = () => db.prepare('SELECT * FROM products ORDER BY id').all();
  const orders = () =>
    db
      .prepare('SELECT * FROM orders ORDER BY id DESC')
      .all()
      .map((o) => ({
        ...o,
        items: db
          .prepare('SELECT productId,name,quantity,isBackorder FROM order_items WHERE orderId=?')
          .all(o.id)
          .map((i) => ({ ...i, isBackorder: Boolean(i.isBackorder) })),
      }));
  return {
    close: () => db.close(),
    products,
    orders,
    addProduct(draft) {
      const name = text(draft.name, 'Name');
      const description = text(draft.description ?? '', 'Description', 2000, true);
      const category = text(draft.category || 'Other', 'Category', 80);
      const unit = text(draft.unit || 'item', 'Unit', 80);
      const imageUrl = text(draft.imageUrl ?? '', 'Image URL', 2000, true);
      if (imageUrl) {
        let url;
        try {
          url = new URL(imageUrl);
        } catch {
          throw new AppError(400, 'Image URL is invalid.');
        }
        if (!['http:', 'https:'].includes(url.protocol))
          throw new AppError(400, 'Use an HTTP or HTTPS image URL.');
      }
      const stock = integer(draft.stock, 'Stock');
      const result = db
        .prepare(
          'INSERT INTO products(name,description,stock,category,imageUrl,unit) VALUES(?,?,?,?,?,?)',
        )
        .run(name, description, stock, category, imageUrl, unit);
      return db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid);
    },
    updateStock(id, input) {
      integer(id, 'Product ID', 1);
      if (!db.prepare('SELECT id FROM products WHERE id=?').get(id))
        throw new AppError(404, 'Product not found.');
      if (input.delta !== undefined) {
        integer(input.delta, 'Stock adjustment', -1000000);
        const result = db
          .prepare('UPDATE products SET stock=stock+? WHERE id=? AND stock+? BETWEEN 0 AND 1000000')
          .run(input.delta, id, input.delta);
        if (!result.changes)
          throw new AppError(
            409,
            'Stock adjustment would exceed the allowed range. Refresh and try again.',
          );
      } else {
        integer(input.stock, 'Stock');
        db.prepare('UPDATE products SET stock=? WHERE id=?').run(input.stock, id);
      }
      return products();
    },
    placeOrder(input) {
      const customerName = text(input.customerName, 'Customer name', 100);
      if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) {
        throw new AppError(400, 'A basket must contain between 1 and 100 product lines.');
      }
      const seen = new Set();
      const items = input.items.map((i) => {
        if (!i || typeof i !== 'object') throw new AppError(400, 'Invalid basket item.');
        integer(i.productId, 'Product ID', 1);
        integer(i.quantity, 'Quantity', 1, 999);
        if (typeof i.isBackorder !== 'boolean') throw new AppError(400, 'Specify the order type.');
        const key = `${i.productId}:${i.isBackorder}`;
        if (seen.has(key)) throw new AppError(400, 'Duplicate basket line.');
        seen.add(key);
        return i;
      });
      db.exec('BEGIN IMMEDIATE');
      try {
        const saved = items.map((i) => {
          const p = db.prepare('SELECT * FROM products WHERE id=?').get(i.productId);
          if (!p) throw new AppError(400, 'A product in your basket no longer exists.');
          if (i.isBackorder && p.stock !== 0)
            throw new AppError(
              409,
              `${p.name} is now in stock. Remove the request and add it from the catalog.`,
            );
          if (!i.isBackorder && i.quantity > p.stock)
            throw new AppError(409, `Only ${p.stock} of ${p.name} remain. Update your basket.`);
          if (!i.isBackorder)
            db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(i.quantity, i.productId);
          return {
            productId: p.id,
            name: p.name,
            quantity: i.quantity,
            isBackorder: i.isBackorder,
          };
        });
        const createdAt = new Date().toISOString();
        const id = Number(
          db
            .prepare('INSERT INTO orders(customerName,createdAt) VALUES(?,?)')
            .run(customerName, createdAt).lastInsertRowid,
        );
        const insert = db.prepare('INSERT INTO order_items VALUES(?,?,?,?,?)');
        for (const i of saved)
          insert.run(id, i.productId, i.name, i.quantity, Number(i.isBackorder));
        db.exec('COMMIT');
        return { order: { id, customerName, createdAt, items: saved }, products: products() };
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
