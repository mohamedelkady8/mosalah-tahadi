import type { Metadata } from 'next';
import { FACEBOOK_GROUP } from './sections';

/** Public address of the site. Vercel fills VERCEL_PROJECT_PRODUCTION_URL with the main domain (custom one once added). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

export const SITE_NAME = 'تيم حمثلاح';
export const TEACHER_NAME = 'مستر محمد صلاح';
export const HOME_TITLE = 'تيم حمثلاح | مستر محمد صلاح - لغة عربية لثانوي';
export const SITE_DESCRIPTION =
  'موقع تيم حمثلاح مع مستر محمد صلاح: ألعاب ومسابقات ومراجعات عربي (نحو وبلاغة وقراءة) لطلاب أولى وتانية وتالتة ثانوي، ثانوية عامة وبكالوريا. العب وذاكر واجمع نقط.';
export const SITE_KEYWORDS = [
  'حمثلاح',
  'تيم حمثلاح',
  'مستر محمد صلاح',
  'محمد صلاح لغة عربية',
  'لغة عربية ثانوي',
  'عربي تالتة ثانوي',
  'عربي تانية ثانوي',
  'عربي أولى ثانوي',
  'ثانوية عامة',
  'بكالوريا',
  'مراجعة نحو',
  'بلاغة',
  'ألعاب تعليمية',
  'مسابقات عربي',
];
export const OG_IMAGE = { url: '/og.jpg', width: 1200, height: 630, alt: 'موقع تيم حمثلاح مع مستر محمد صلاح' };
export const SOCIAL_LINKS = [FACEBOOK_GROUP.split('?')[0]];

/** Title, description, canonical address and share card for a public page. */
export function pageMeta({ title, description, path, absoluteTitle }: { title: string; description: string; path: string; absoluteTitle?: boolean }): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'ar_EG',
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [OG_IMAGE.url] },
  };
}

/** Pages that only make sense after signing in. */
export const PRIVATE_META: Metadata = { robots: { index: false, follow: false } };
