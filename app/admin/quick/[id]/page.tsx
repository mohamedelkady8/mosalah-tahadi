import { EditGamePage } from '@/components/admin/GameAdminPages';

export const metadata = { title: 'تعديل تحدي' };

export default function EditQuick({ params }: { params: Promise<{ id: string }> }) {
  return <EditGamePage kind="quick" params={params} />;
}
