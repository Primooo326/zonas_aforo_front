'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function FlyonuiScript() {
  const path = usePathname();

  useEffect(() => {
    const init = async () => {
      try {
        await import('flyonui/flyonui');
      } catch (e) {
        console.warn('FlyonUI load error:', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (window.HSStaticMethods && typeof window.HSStaticMethods.autoInit === 'function') {
        window.HSStaticMethods.autoInit();
      }
    }, 100);
  }, [path]);

  return null;
}
