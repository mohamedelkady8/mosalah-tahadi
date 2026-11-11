import type { Metadata } from 'next';
import { QuickView } from '../QuickView';

export const metadata: Metadata = { title: 'ع السريع' };

export default async function QuickChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QuickView slug={slug} />;
}
