import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RegisterSW } from '@/components/RegisterSW';
import { Bootstrap } from '@/components/Bootstrap';
import { Reminders } from '@/components/Reminders';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Forge',
  description: 'Home workouts and running, tracked.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Forge', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <RegisterSW />
        <Bootstrap />
        <Reminders />
      </body>
    </html>
  );
}
