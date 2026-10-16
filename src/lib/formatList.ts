export function parseListItems(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(i => String(i).trim()).filter(Boolean);
  if (typeof input !== 'string') return [];

  const raw = input.trim();
  if (!raw) return [];

  // 1. Cek jika dipisahkan oleh baris baru (enter)
  let lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 2. Jika hanya 1 baris panjang tapi memiliki format nomor (contoh: "1. Misi A 2. Misi B 3. Misi C")
  if (lines.length <= 1) {
    // Regex memecah berdasarkan pola "1.", "2)", "3 -", dll.
    const splitRegex = /(?:^|\s+)(?:\d+[\.\)]|\-|\•)\s+/;
    const items = raw.split(splitRegex).map(item => item.trim()).filter(Boolean);
    if (items.length > 1) {
      return items;
    }
  }

  // 3. Bersihkan sisa nomor di awal kalimat (misal "1. ", "- ") agar nomor dibuat murni oleh UI badge
  return lines.map(line => line.replace(/^(?:\d+[\.\)]|\-|\•)\s*/, '').trim()).filter(Boolean);
}
