import test from 'node:test';
import assert from 'node:assert/strict';
import { validPhoto, catalogPhoto } from '../server/photos.mjs';

test('photo validator accepts bounded JPEG signatures and rejects other formats', () => {
  const sample = 'data:image/jpeg;base64,' + Buffer.from([255,216,255,224,255,217]).toString('base64');
  assert.equal(validPhoto(sample), true);
  assert.equal(validPhoto('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(validPhoto('data:image/jpeg;base64,SGVsbG8='), false);
  assert.equal(validPhoto('data:image/jpeg;base64,' + 'A'.repeat(96000)), false);
  assert.equal(validPhoto(null), false);
  assert.deepEqual(catalogPhoto({id: 4, imageUrl: sample}), {id: 4, imageUrl: '/api/products/4/photo'});
  assert.equal(catalogPhoto({id: 5, imageUrl: 'https://example.com/image.jpg'}).imageUrl, 'https://example.com/image.jpg');
});

test('local product photo replacement preserves stock and supports removal', async () => {
  const { openStore } = await import('../server/database.mjs');
  const store = openStore(':memory:');
  try {
    const product = store.addProduct({name:'Photo test',description:'Original description',category:'Test',unit:'item',stock:7,imageUrl:''});
    const sample = 'data:image/jpeg;base64,' + Buffer.from([255,216,255,224,255,217]).toString('base64');
    const changed = store.updatePhoto(product.id,{imageUrl:sample}).find(p=>p.id===product.id);
    assert.equal(changed.stock,7);
    assert.equal(changed.description,'Original description');
    assert.equal(changed.imageUrl,'/api/products/'+product.id+'/photo');
    assert.equal(store.photo(product.id),sample);
    assert.throws(()=>store.updatePhoto(product.id,{imageUrl:'data:text/html;base64,AAAA'}),/valid JPEG/);
    assert.equal(store.photo(product.id),sample);
    const removed=store.updatePhoto(product.id,{imageUrl:''}).find(p=>p.id===product.id);
    assert.equal(removed.imageUrl,'');
    assert.equal(removed.stock,7);
    assert.throws(()=>store.updatePhoto(9999999,{imageUrl:sample}),/not found/);
  } finally { store.close(); }
});
