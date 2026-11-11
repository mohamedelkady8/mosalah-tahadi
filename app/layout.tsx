import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Lalezar, Montserrat } from 'next/font/google';
import { TransitionSettler } from '@/components/motion/PageTransition';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { ToastProvider } from '@/components/ui/Toast';
import { HOME_TITLE, OG_IMAGE, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_URL, TEACHER_NAME } from '@/lib/site';
import './globals.css';
import './ui.css';
import './games.css';
import './hub.css';

// `subsets` only picks which files are preloaded; the others still load on demand. Every page is
// Arabic, so only the Arabic files are worth fetching before the first paint.
const lalezar = Lalezar({
  weight: '400',
  subsets: ['arabic'],
  variable: '--font-lalezar',
  display: 'swap',
});

const plex = IBM_Plex_Sans_Arabic({
  weight: ['400', '600', '700'],
  subsets: ['arabic'],
  variable: '--font-plex',
  display: 'swap',
});

// The medium weight only appears in a few small notes (form hints, sub-lines), so it loads when one shows up.
const plexMedium = IBM_Plex_Sans_Arabic({
  weight: '500',
  subsets: ['arabic'],
  variable: '--font-plex-medium',
  display: 'swap',
  preload: false,
});

const montserrat = Montserrat({
  weight: ['500', '600'],
  subsets: ['latin'],
  variable: '--font-mont',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: TEACHER_NAME }],
  creator: TEACHER_NAME,
  category: 'education',
  formatDetection: { telephone: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: { type: 'website', locale: 'ar_EG', siteName: SITE_NAME, title: HOME_TITLE, description: SITE_DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: HOME_TITLE, description: SITE_DESCRIPTION, images: [OG_IMAGE.url] },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#651A29',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${lalezar.variable} ${plex.variable} ${plexMedium.variable} ${montserrat.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <TransitionSettler />
        <SmoothScroll />
      </body>
    </html>
  );
}
