/** Kirish sahifasiga `next` bilan — muvaffaqiyatdan keyin shu yo‘lga qaytadi. */
export function loginWithNext(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/login?next=${encodeURIComponent(p)}`;
}
