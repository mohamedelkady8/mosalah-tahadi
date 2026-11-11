/** Shrinks big photos before upload so games load fast on mobile data. GIFs are kept as they are. */
export async function prepareImage(file: File, maxDim = 1600): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
  return blob && blob.size < file.size ? blob : file;
}
