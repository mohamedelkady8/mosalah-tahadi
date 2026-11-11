import { Landing } from '@/components/landing/Landing';
import { getSession } from '@/lib/data';

export default async function HomePage() {
  const { profile } = await getSession();
  return <Landing nextHref={profile ? '/wheel' : '/grades'} />;
}
