import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Banks Family Reunion',
  description: 'Honoring our roots. Gathering our family.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F6E39A' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
