import { AdminTop } from '@/components/admin/AdminShell';
import { QuotesManager } from '@/components/admin/QuotesManager';
import { requireAdmin } from '@/lib/admin';
import { cairoDayNumber } from '@/lib/format';
import type { Quote } from '@/lib/types';

export const metadata = { title: 'جمل الصفحة الرئيسية' };

export default async function AdminQuotes() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('quotes').select('id, text, active, sort_order').order('sort_order').order('created_at');
  const quotes = (data ?? []) as Quote[];
  const active = quotes.filter((q) => q.active);
  const todayId = active.length ? active[cairoDayNumber() % active.length].id : null;

  return (
    <>
      <AdminTop title="جمل الصفحة الرئيسية" sub="الجملة اللي بتتغير كل يوم تحت «جملة النهارده»." />
      <QuotesManager quotes={quotes} todayId={todayId} />
    </>
  );
}
