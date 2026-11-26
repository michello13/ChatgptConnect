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
