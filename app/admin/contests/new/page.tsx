import { NewGamePage } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'مسابقة جديدة' };

export default function NewContest({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <NewGamePage kind="contest" searchParams={searchParams} />;
}
