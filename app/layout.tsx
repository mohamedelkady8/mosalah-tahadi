import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Lalezar, Montserrat } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';
import './ui.css';
import './games.css';

const lalezar = Lalezar({
  weight: '400',
  subsets: ['arabic', 'latin'],
  variable: '--font-lalezar',
  display: 'swap',
});

const plex = IBM_Plex_Sans_Arabic({
  weight: ['400', '500', '600', '700'],
  subsets: ['arabic', 'latin'],
  variable: '--font-plex',
  display: 'swap',
});

const montserrat = Montserrat({
  weight: ['500', '600'],
  subsets: ['latin'],
  variable: '--font-mont',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'موقع تيم حمثلاح', template: '%s | تيم حمثلاح' },
  description: 'ألعاب ومسابقات في اللغة العربية لطلاب ثانوي، من تيم حمثلاح. We Don’t Study Alone.',
  icons: { icon: '/assets/logo.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#651A29',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${lalezar.variable} ${plex.variable} ${montserrat.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
