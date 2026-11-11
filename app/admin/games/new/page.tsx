import { NewGamePage } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'لعبة جديدة' };

export default function NewGame({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <NewGamePage kind="game" searchParams={searchParams} />;
}
