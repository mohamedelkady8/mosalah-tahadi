import type { Metadata } from 'next';
import { Landing } from '@/components/landing/Landing';
import { getSession } from '@/lib/data';
import { HOME_TITLE, pageMeta, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL_LINKS, TEACHER_NAME } from '@/lib/site';

export const metadata: Metadata = pageMeta({ title: HOME_TITLE, description: SITE_DESCRIPTION, path: '/', absoluteTitle: true });

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ['حمثلاح', 'موقع تيم حمثلاح', 'Hamthalah'],
      description: SITE_DESCRIPTION,
      inLanguage: 'ar-EG',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: 'حمثلاح',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon-512.png`,
      image: `${SITE_URL}/og.jpg`,
      slogan: 'We Don’t Study Alone.',
      areaServed: { '@type': 'Country', name: 'Egypt' },
      sameAs: SOCIAL_LINKS,
      founder: { '@id': `${SITE_URL}/#teacher` },
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#teacher`,
      name: TEACHER_NAME,
      alternateName: 'محمد صلاح',
      jobTitle: 'مدرس لغة عربية لثانوي',
      image: `${SITE_URL}/assets/mr-salah.webp`,
      worksFor: { '@id': `${SITE_URL}/#org` },
      knowsAbout: ['اللغة العربية', 'النحو', 'البلاغة', 'القراءة'],
    },
  ],
};

export default async function HomePage() {
  const { profile } = await getSession();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c') }} />
      <Landing nextHref={profile ? '/wheel' : '/grades'} />
    </>
  );
}
