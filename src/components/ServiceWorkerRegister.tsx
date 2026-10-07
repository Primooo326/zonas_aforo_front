'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production';
    const isExplicitlyEnabled = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

    if ('serviceWorker' in navigator && (isProd || isExplicitlyEnabled)) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] Nueva versión disponible, actualice para ver los cambios.');
                  } else {
                    console.log('[PWA] Contenido cacheado para soporte offline.');
                  }
                }
              };
            }
          };
        } catch (error) {
          console.error('[PWA] Error al registrar el Service Worker:', error);
        }
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
