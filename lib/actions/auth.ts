'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authErrorMessage, NOT_CONFIGURED } from '@/lib/auth/errors';
import { normalizePhone, parseIdentifier, safeNext } from '@/lib/auth/identifier';
import { getCatalog, getSession } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Catalog } from '@/lib/types';

export interface FormState {
  error?: string;
  message?: string;
  values?: Record<string, string>;
}

const str = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

async function originFromHeaders() {
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Checks the grade exists and picks the track: the only one, or the chosen one if the grade has several. */
function resolveGradeTrack(catalog: Catalog, gradeId: string, trackId: string) {
  const grade = catalog.grades.find((g) => g.id === gradeId && g.active);
  if (!grade) return { error: 'اختار مرحلتك.' } as const;
  if (grade.trackIds.length === 0) return { grade, trackId: null } as const;
  if (grade.trackIds.length === 1) return { grade, trackId: grade.trackIds[0] } as const;
  if (!grade.trackIds.includes(trackId)) return { error: 'اختار الشعبة: بكالوريا ولا ثانوية عامة.' } as const;
  return { grade, trackId } as const;
}

async function destinationFor(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('role, grades(slug)').eq('id', userId).maybeSingle();
  if (!data) return '/grades';
  if (data.role === 'admin') return '/admin';
  const grade = data.grades as unknown as { slug: string } | null;
  return grade?.slug ? `/grades/${grade.slug}` : '/grades';
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = str(formData, 'identifier');
  const values = { identifier };
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED, values };

  const id = parseIdentifier(identifier);
  if (!id) return { error: 'اكتب رقم موبايل أو إيميل صحيح.', values };
  const password = String(formData.get('password') ?? '');
  if (!password) return { error: 'اكتب كلمة السر.', values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: id.email, password });
  if (error || !data.user) return { error: authErrorMessage(error), values };

  redirect(safeNext(formData.get('next')) ?? (await destinationFor(data.user.id)));
}

const signUpSchema = z.object({
  full_name: z.string().min(2, 'اكتب اسمك بالكامل.').max(60, 'الاسم طويل أوي.'),
  identifier: z.string().min(1, 'اكتب رقم الموبايل أو الإيميل.'),
  password: z
    .string()
    .min(6, 'كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل.')
    .max(72, 'كلمة السر طويلة أوي.'),
  grade_id: z.string().min(1, 'اختار مرحلتك.'),
  track_id: z.string(),
});

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    full_name: str(formData, 'full_name').replace(/\s+/g, ' '),
    identifier: str(formData, 'identifier'),
    password: String(formData.get('password') ?? ''),
    grade_id: str(formData, 'grade_id'),
    track_id: str(formData, 'track_id'),
  };
  const values = { full_name: raw.full_name, identifier: raw.identifier, grade_id: raw.grade_id, track_id: raw.track_id };
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED, values };

  // Bots fill every field, including this hidden one.
  if (str(formData, 'website')) return { message: 'تمام!' };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  const input = parsed.data;

  const id = parseIdentifier(input.identifier);
  if (!id) return { error: 'اكتب رقم موبايل مصري صحيح (زي 01012345678) أو إيميل صحيح.', values };

  const catalog = await getCatalog();
  const resolved = resolveGradeTrack(catalog, input.grade_id, input.track_id);
  if ('error' in resolved) return { error: resolved.error, values };

  const metadata = {
    full_name: input.full_name,
    phone: id.kind === 'phone' ? id.phone : null,
    grade_id: resolved.grade.id,
    track_id: resolved.trackId,
  };

  const admin = createAdminClient();
  const supabase = await createClient();

  if (admin) {
    const { error } = await admin.auth.admin.createUser({
      email: id.email,
      password: input.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) {
      if (error.code !== 'email_exists' && error.code !== 'user_already_exists') console.error('createUser failed', error);
      return { error: authErrorMessage(error), values };
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: id.email, password: input.password });
    if (signInError) return { error: authErrorMessage(signInError), values };
  } else {
    if (id.kind === 'phone') {
      return {
        error: 'التسجيل برقم الموبايل محتاج SUPABASE_SERVICE_ROLE_KEY على السيرفر. سجّل بالإيميل لحد ما يتظبط.',
        values,
      };
    }
    const origin = await originFromHeaders();
    const { data, error } = await supabase.auth.signUp({
      email: id.email,
      password: input.password,
      options: { data: metadata, emailRedirectTo: `${origin}/auth/callback?next=/grades/${resolved.grade.slug}` },
    });
    if (error) return { error: authErrorMessage(error), values };
    if (!data.session) return { message: 'بعتنالك إيميل تأكيد. افتحه ودوس على اللينك عشان تكمّل.' };
  }

  redirect(`/grades/${resolved.grade.slug}?welcome=1`);
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/');
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await getSession();
  if (!userId) return { error: 'سجّل دخولك الأول.' };

  const fullName = str(formData, 'full_name').replace(/\s+/g, ' ');
  if (fullName.length < 2 || fullName.length > 60) return { error: 'اكتب اسمك بالكامل.' };
  const phoneRaw = str(formData, 'phone');
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: 'رقم الموبايل مش مظبوط.' };

  const catalog = await getCatalog();
  const resolved = resolveGradeTrack(catalog, str(formData, 'grade_id'), str(formData, 'track_id'));
  if ('error' in resolved) return { error: resolved.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone, grade_id: resolved.grade.id, track_id: resolved.trackId })
    .eq('id', userId);
  if (error) {
    console.error('profile update failed', error);
    return { error: 'معرفناش نحفظ التعديلات، جرّب تاني.' };
  }
  revalidatePath('/', 'layout');
  return { message: 'اتحفظت التعديلات.' };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await getSession();
  if (!userId) return { error: 'سجّل دخولك الأول.' };
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 6) return { error: 'كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل.' };
  if (password !== confirm) return { error: 'كلمتين السر مش زي بعض.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error) };
  return { message: 'اتغيّرت كلمة السر.' };
}
