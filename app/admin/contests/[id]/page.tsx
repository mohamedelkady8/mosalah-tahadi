import { EditGamePage } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'تعديل مسابقة' };

export default function EditContest({ params }: { params: Promise<{ id: string }> }) {
  return <EditGamePage kind="contest" params={params} />;
}
