import type { Metadata } from 'next';
import { PRIVATE_META } from '@/lib/site';
import { QuickView } from '../QuickView';

export const metadata: Metadata = { title: 'ع السريع', ...PRIVATE_META };

export default async function QuickChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QuickView slug={slug} />;
}
