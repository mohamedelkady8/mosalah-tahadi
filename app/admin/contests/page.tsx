import { GamesList } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'المسابقات' };

export default function AdminContests({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <GamesList kind="contest" searchParams={searchParams} />;
}
