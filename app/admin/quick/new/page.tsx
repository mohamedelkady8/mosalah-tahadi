import { NewGamePage } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'تحدي جديد' };

export default function NewQuick({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <NewGamePage kind="quick" searchParams={searchParams} />;
}
