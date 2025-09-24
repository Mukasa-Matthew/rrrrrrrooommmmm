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
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show update notification
                if (confirm('New version available! Reload to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch(() => {});

    // Handle app install prompt
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button or notification
      const installButton = document.createElement('button');
      installButton.textContent = 'Install RooMio';
      installButton.className = 'fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      installButton.onclick = () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
          installButton.remove();
        });
      };
      document.body.appendChild(installButton);
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });
  }, []);
  return null;
}

