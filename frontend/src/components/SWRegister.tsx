'use client';

import { useEffect } from 'react';

export function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // In development, ensure no service worker interferes with HMR/chunks
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
      return;
    }

    // Production: register SW
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

