import { EditGamePage } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'تعديل لعبة' };

export default function EditGame({ params }: { params: Promise<{ id: string }> }) {
  return <EditGamePage kind="game" params={params} />;
}
