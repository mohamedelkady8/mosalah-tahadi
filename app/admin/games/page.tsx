import { GamesList } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'الألعاب' };

export default function AdminGames({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <GamesList kind="game" searchParams={searchParams} />;
}
