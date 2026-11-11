import type { UserRole } from './types';

export const ROLE_LABELS: Record<UserRole, string> = { student: 'طالب', admin: 'أدمن', support: 'دعم' };

/** Admins and support staff both use the dashboard; support only gets the student lookup. */
export const isStaff = (role: UserRole | null | undefined) => role === 'admin' || role === 'support';

export const SUPPORT_HOME = '/admin/lookup';

/** Where an account lands after signing in. */
export function homeFor(role: UserRole | null | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'support') return SUPPORT_HOME;
  return '/wheel';
}
