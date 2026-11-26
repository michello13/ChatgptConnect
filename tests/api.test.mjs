import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../server/database.mjs';
import { createApp } from '../server/app.mjs';

async function fixture(t) {
  const store = openStore(':memory:');
  const server = createApp(store, { adminPin: 'test-pin' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body, cookie) {
    return fetch(`${base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function login() {
    const response = await request('/admin/login', 'POST', { pin: 'test-pin' });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  return { store, request, login, base };
}
const take = (productId, quantity = 1, isBackorder = false) => ({
  productId,
  quantity,
  isBackorder,
});

test('customer checkout saves stock and backorders without prices', async (t) => {
  const { store, request } = await fixture(t);
  const response = await request('/orders', 'POST', {
    customerName: 'Robin',
    items: [take(1, 2), take(3, 3, true)],
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.products.find((p) => p.id === 1).stock, 22);
  assert.equal(result.products.find((p) => p.id === 3).stock, 0);
  assert.equal(result.order.items[1].isBackorder, true);
  assert.equal(store.orders()[0].customerName, 'Robin');
  assert.equal('price' in result.products[0], false);
});

test('a stale checkout rolls back all stock changes and creates no order', async (t) => {
  const { store, request } = await fixture(t);
  store.updateStock(6, { stock: 1 });
  const response = await request('/orders', 'POST', {
    customerName: 'Robin',
    items: [take(1, 2), take(6, 2)],
  });
  assert.equal(response.status, 409);
  assert.equal(store.products()[0].stock, 24);
  assert.equal(store.orders().length, 0);
});

test('two buyers cannot take the same last item', async (t) => {
  const { store, request } = await fixture(t);
  store.updateStock(1, { stock: 1 });
  const responses = await Promise.all(
    ['Alex', 'Sam'].map((customerName) =>
      request('/orders', 'POST', { customerName, items: [take(1)] }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  assert.equal(store.products()[0].stock, 0);
  assert.equal(store.orders().length, 1);
});

test('invalid quantities, duplicate lines and invalid backorders are rejected', async (t) => {
  const { store, request } = await fixture(t);
  for (const items of [
    [take(1, -1)],
    [take(1, 1.5)],
    [take(1), take(1)],
    [take(999)],
    [take(1, 1, true)],
  ]) {
    const response = await request('/orders', 'POST', { customerName: 'Robin', items });
    assert.ok([400, 409].includes(response.status));
  }
  assert.equal(store.orders().length, 0);
  assert.equal(store.products()[0].stock, 24);
});

test('admin APIs protect customer names and inventory; logout revokes access', async (t) => {
  const { request, login } = await fixture(t);
  assert.equal((await request('/admin/orders')).status, 401);
  assert.equal((await request('/admin/products/1/stock', 'PATCH', { stock: 3 })).status, 401);
  assert.equal((await request('/admin/login', 'POST', { pin: 'wrong' })).status, 401);
  const cookie = await login();
  const product = {
    name: 'Garden herbs',
    description: 'Freshly picked',
    category: 'Foraged',
    unit: 'bunch',
    imageUrl: '',
    stock: 4,
  };
  assert.equal((await request('/admin/products', 'POST', product, cookie)).status, 201);
  assert.equal(
    (await request('/admin/products/1/stock', 'PATCH', { stock: 0 }, cookie)).status,
    200,
  );
  assert.equal(
    (await request('/admin/products/1/stock', 'PATCH', { stock: -1 }, cookie)).status,
    400,
  );
  assert.equal((await request('/admin/orders', 'GET', undefined, cookie)).status, 200);
  assert.equal((await request('/admin/logout', 'POST', {}, cookie)).status, 200);
  assert.equal((await request('/admin/orders', 'GET', undefined, cookie)).status, 401);
});

test('cross-site writes and repeated bad PINs are blocked', async (t) => {
  const { base, request } = await fixture(t);
  const crossSite = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { origin: 'https://example.com', 'Content-Type': 'application/json' },
    body: '{"pin":"test-pin"}',
  });
  assert.equal(crossSite.status, 403);
  for (let i = 0; i < 10; i++)
    assert.equal((await request('/admin/login', 'POST', { pin: 'wrong' })).status, 401);
  assert.equal((await request('/admin/login', 'POST', { pin: 'test-pin' })).status, 429);
});

test('SQLite data survives reopening the database', () => {
  const folder = mkdtempSync(join(tmpdir(), 'honesty-test-'));
  const filename = join(folder, 'test.sqlite');
  try {
    let store = openStore(filename);
    store.placeOrder({ customerName: 'Robin', items: [take(1, 2)] });
    store.close();
    store = openStore(filename);
    assert.equal(store.products()[0].stock, 22);
    assert.equal(store.orders()[0].customerName, 'Robin');
    store.close();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test('wishes are independent of stock, private, archived without deleting history', async t=>{
  const {store,request,login}=await fixture(t);
  const before=store.products().map(p=>p.stock);
  const response=await request('/wishes','POST',{customerName:'Robin',items:[take(1,2),take(3,3)],note:'Love the cruesli'});
  assert.equal(response.status,201);
  assert.deepEqual(store.products().map(p=>p.stock),before);
  assert.equal(store.orders().length,0);
  assert.equal((await request('/admin/wishes')).status,401);
  const cookie=await login();
  let wishes=await (await request('/admin/wishes','GET',undefined,cookie)).json();
  assert.equal(wishes.length,2);
  assert.equal(wishes[0].note,'Love the cruesli');
  assert.equal((await request('/admin/wishes/'+wishes[0].id+'/archive','PATCH',{})).status,401);
  const archived=await request('/admin/wishes/'+wishes[0].id+'/archive','PATCH',{},cookie);
  assert.equal(archived.status,200);
  wishes=await archived.json();
  assert.equal(wishes.filter(w=>w.archivedAt).length,1);
  assert.equal(wishes.length,2);
  assert.equal((await request('/wishes','POST',{customerName:'Robin',items:[take(1),take(999999)]})).status,409);
  assert.equal(store.wishes().length,2);
  assert.equal((await request('/wishes','POST',{customerName:'Robin',items:[take(1),take(1)]})).status,400);
  assert.equal((await request('/admin/announcement','PATCH',{message:'Fresh eggs!'})).status,401);
  assert.equal((await request('/admin/announcement','PATCH',{message:'Fresh eggs!'},cookie)).status,200);
  assert.equal((await (await request('/announcement')).json()).message,'Fresh eggs!');
});
test('legacy backorders are included once in wishlist history', async t=>{
  const {store,request,login}=await fixture(t);
  assert.equal((await request('/orders','POST',{customerName:'Alex',items:[take(3,2,true)]})).status,201);
  const cookie=await login();
  for(let i=0;i<2;i++){
    const wishes=await (await request('/admin/wishes','GET',undefined,cookie)).json();
    assert.equal(wishes.length,1);
    assert.equal(wishes[0].quantity,2);
  }
  assert.equal(store.orders().length,1);
});
