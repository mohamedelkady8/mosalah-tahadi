import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import { SitePage } from '@/components/site/SiteHeader';
import { getSample } from '@/lib/games/samples';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const game = getSample((await params).slug);
  return { title: game?.title ?? 'لعبة تجريبية' };
}

export default async function TryGamePage({ params }: { params: Params }) {
  const game = getSample((await params).slug);
  if (!game) notFound();
  return (
    <SitePage back={{ href: '/try', label: 'الألعاب التجريبية' }}>
      <GameShell game={game} mode="practice" backHref="/try" backLabel="ألعاب تانية" />
    </SitePage>
  );
}
