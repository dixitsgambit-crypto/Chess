import { useEffect, useState } from 'react';
import { useStore } from './store';

/** Reduced motion: the user's setting wins; "system" follows prefers-reduced-motion. */
export function usePrefersReducedMotion(): boolean {
  const { settings } = useStore();
  const [system, setSystem] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const reduced = settings.reducedMotion === 'on' || (settings.reducedMotion === 'system' && system);
  useEffect(() => { document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'; }, [reduced]);
  return reduced;
}
