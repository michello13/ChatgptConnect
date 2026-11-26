import { randomUUID } from 'node:crypto';

// Additive tables: no existing inventory, order or checkout records are changed.
export const wishSchema = [
  "CREATE TABLE IF NOT EXISTS wishes (id TEXT PRIMARY KEY, productId INTEGER NOT NULL REFERENCES products(id), name TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 999), customerName TEXT NOT NULL, createdAt TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', archivedAt TEXT)",
  "CREATE TABLE IF NOT EXISTS box_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
];
export const importLegacyWishes = "INSERT OR IGNORE INTO wishes(id,productId,name,quantity,customerName,createdAt,note) SELECT 'legacy:' || o.id || ':' || i.productId,i.productId,i.name,i.quantity,o.customerName,o.createdAt,'' FROM order_items i JOIN orders o ON o.id=i.orderId WHERE i.isBackorder=1";
export const listWishes = 'SELECT id,productId,name,quantity,customerName,createdAt,note,archivedAt FROM wishes ORDER BY createdAt DESC,id';
export const archiveWishSql = 'UPDATE wishes SET archivedAt=COALESCE(archivedAt,?) WHERE id=?';
export const messageSql = "SELECT value FROM box_settings WHERE key='announcement'";
export const saveMessageSql = "INSERT INTO box_settings(key,value) VALUES('announcement',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value";
// All requested lines are saved in one statement, or none if a product no longer exists.
export const insertWishes = `INSERT INTO wishes(id,productId,name,quantity,customerName,createdAt,note)
 SELECT ? || ':' || p.id,p.id,p.name,json_extract(j.value,'$.quantity'),?,?,?
 FROM json_each(?) j JOIN products p ON p.id=json_extract(j.value,'$.productId')
 WHERE NOT EXISTS (SELECT 1 FROM json_each(?) x LEFT JOIN products missing ON missing.id=json_extract(x.value,'$.productId') WHERE missing.id IS NULL)
 RETURNING productId,name,quantity`;

export function prepareWishes(input, { AppError, integer, text }) {
  const customerName=text(input.customerName,'Your name',100);
  const note=text(input.note??'','Note',500,true);
  if (!Array.isArray(input.items) || input.items.length<1 || input.items.length>100) throw new AppError(400,'Choose between 1 and 100 products.');
  const seen=new Set();
  const items=input.items.map(item=>{
    if(!item || typeof item!=='object') throw new AppError(400,'Invalid wish.');
    const productId=integer(item.productId,'Product ID',1);
    const quantity=integer(item.quantity,'Quantity',1,999);
    if(seen.has(productId)) throw new AppError(400,'Duplicate wish.');
    seen.add(productId);
    return {productId,quantity};
  });
  const createdAt=new Date().toISOString();
  const json=JSON.stringify(items);
  return {customerName,createdAt,items,args:[randomUUID(),customerName,createdAt,note,json,json]};
}
export function wishReceipt(prepared, rows, AppError) {
  if(rows.length!==prepared.items.length) throw new AppError(409,'A product is no longer available to request. Refresh and try again.');
  return {customerName:prepared.customerName,createdAt:prepared.createdAt,items:rows.map(row=>({...row,isBackorder:true}))};
}
