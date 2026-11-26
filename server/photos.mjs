// Only allow bounded JPEG uploads, never HTML or SVG data URLs.
export function validPhoto(value) {
  if (typeof value !== 'string' || value.length > 96000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const encoded = value.slice('data:image/jpeg;base64,'.length);
  const bytes = Buffer.from(encoded, 'base64');
  return bytes.toString('base64') === encoded && bytes.length >= 4 &&
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 &&
    bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
}
export function catalogPhoto(product) {
  return product.imageUrl?.startsWith('data:image/jpeg;base64,')
    ? { ...product, imageUrl: '/api/products/' + product.id + '/photo' } : product;
}
export const catalogColumns = "id,name,description,stock,category,unit,CASE WHEN imageUrl LIKE 'data:image/jpeg;base64,%' THEN '/api/products/' || id || '/photo' ELSE imageUrl END AS imageUrl";
