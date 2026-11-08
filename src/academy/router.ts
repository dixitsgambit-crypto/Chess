import { useSyncExternalStore } from 'react';

/** Minimal hash router: #/section/param/param */
function current(): string[] {
  const h = location.hash.replace(/^#\/?/, '');
  return h ? h.split('/').map(decodeURIComponent) : ['home'];
}
let parts = current();
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  parts = current();
  listeners.forEach((l) => l());
  window.scrollTo({ top: 0 });
});

export function useRoute(): string[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => parts);
}
export function go(path: string) {
  location.hash = '#/' + path.replace(/^\/+/, '');
}
export const href = (path: string) => '#/' + path.replace(/^\/+/, '');
