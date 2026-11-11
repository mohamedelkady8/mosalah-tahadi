import { GamesList } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'ع السريع' };

export default function AdminQuick({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <GamesList kind="quick" searchParams={searchParams} />;
}
