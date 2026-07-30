import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestión de Aforo - Zonas Comunes',
    short_name: 'Aforo',
    description: 'Sistema de gestión de aforo para zonas comunes de edificios',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [
      { src: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  };
}
