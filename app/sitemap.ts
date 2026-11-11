import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/data';
import { SAMPLE_GAMES } from '@/lib/games/samples';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();
  const page = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly') => ({
    url: `${SITE_URL}${path}`,
    priority,
    changeFrequency,
  });
  return [
    page('/', 1, 'weekly'),
    page('/grades', 0.9, 'weekly'),
    ...catalog.grades.filter((g) => g.active).map((g) => page(`/grades/${g.slug}`, 0.8, 'weekly')),
    page('/try', 0.8, 'monthly'),
    ...SAMPLE_GAMES.map((g) => page(`/try/${g.slug}`, 0.6, 'monthly')),
    page('/daily', 0.7, 'daily'),
    page('/tips', 0.6, 'weekly'),
    page('/videos', 0.6, 'weekly'),
    page('/leaderboard', 0.5, 'daily'),
    page('/signup', 0.5, 'monthly'),
    page('/login', 0.3, 'monthly'),
  ];
}
