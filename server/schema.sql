PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,stock INTEGER NOT NULL CHECK(stock>=0),category TEXT NOT NULL,imageUrl TEXT NOT NULL,unit TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY,customerName TEXT NOT NULL,createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS order_items (orderId INTEGER NOT NULL REFERENCES orders(id),productId INTEGER NOT NULL REFERENCES products(id),name TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),isBackorder INTEGER NOT NULL CHECK(isBackorder IN (0,1)),PRIMARY KEY(orderId,productId,isBackorder));
CREATE TABLE IF NOT EXISTS admin_sessions(token TEXT PRIMARY KEY,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts(ip TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS checkout_requests(id INTEGER PRIMARY KEY,customerName TEXT NOT NULL,createdAt TEXT NOT NULL,items TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS checkout_atomic AFTER INSERT ON checkout_requests BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.items) j LEFT JOIN products p ON p.id=json_extract(j.value,'$.productId') WHERE p.id IS NULL OR (json_extract(j.value,'$.isBackorder')=1 AND p.stock<>0) OR (json_extract(j.value,'$.isBackorder')=0 AND p.stock<json_extract(j.value,'$.quantity'))) THEN RAISE(ABORT,'Stock conflict') END;
 INSERT INTO orders(id,customerName,createdAt) VALUES(NEW.id,NEW.customerName,NEW.createdAt);
 INSERT INTO order_items SELECT NEW.id,p.id,p.name,json_extract(j.value,'$.quantity'),json_extract(j.value,'$.isBackorder') FROM json_each(NEW.items) j JOIN products p ON p.id=json_extract(j.value,'$.productId');
 UPDATE products SET stock=stock-(SELECT quantity FROM order_items WHERE orderId=NEW.id AND productId=products.id AND isBackorder=0) WHERE id IN (SELECT productId FROM order_items WHERE orderId=NEW.id AND isBackorder=0);
END;

CREATE TABLE IF NOT EXISTS wishes (id TEXT PRIMARY KEY, productId INTEGER NOT NULL REFERENCES products(id), name TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 999), customerName TEXT NOT NULL, createdAt TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', archivedAt TEXT);
CREATE TABLE IF NOT EXISTS box_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
