import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LogPose Vzla',
    short_name: 'LogPose',
    description: 'Tu sistema financiero personal premium.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#0f172a',
    lang: 'es',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
