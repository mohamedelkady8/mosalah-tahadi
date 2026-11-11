import { redirect } from 'next/navigation';
import { getCatalog, getSession } from '@/lib/data';

/** The wheel's "ألعاب" section: your grade's games, or the practice games for visitors. */
export default async function GamesRedirect() {
  const [{ profile }, catalog] = await Promise.all([getSession(), getCatalog()]);
  if (!profile) redirect('/try');
  const grade = catalog.grades.find((g) => g.id === profile.grade_id);
  if (grade) redirect(`/grades/${grade.slug}`);
  redirect(profile.role === 'admin' ? '/admin/games' : '/grades');
}
