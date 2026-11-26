// Keep catalog images small enough for inexpensive storage and fast mobile loading.
export async function preparePhoto(file: File): Promise<string> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo smaller than 25 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('This photo format could not be opened. Try JPEG or PNG.'); }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !image.naturalWidth || !image.naturalHeight) throw new Error('Unable to prepare photo.');
    for (const size of [800, 640, 480, 320]) {
      const ratio = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.45]) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.startsWith('data:image/jpeg;base64,') && data.length <= 96000) return data;
      }
    }
    throw new Error('The photo is too detailed. Try another image.');
  } finally { URL.revokeObjectURL(url); }
}
