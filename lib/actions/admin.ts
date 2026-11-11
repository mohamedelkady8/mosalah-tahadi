'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { GRADE_ICON_PATHS } from '@/components/ui/icons';
import { authErrorMessage } from '@/lib/auth/errors';
import { normalizePhone, parseIdentifier } from '@/lib/auth/identifier';
import { getCatalog, getSession } from '@/lib/data';
import { checkContent, getDef } from '@/lib/games/registry';
import { uid } from '@/lib/games/random';
import { parseSettings } from '@/lib/games/settings';
import { GAME_TYPES } from '@/lib/games/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Catalog } from '@/lib/types';

export type ActionResult = { ok: true; id?: string; slug?: string; message?: string; warnings?: string[] } | { ok: false; error: string; errors?: string[] };

const NOT_ADMIN: ActionResult = { ok: false, error: 'العملية دي للأدمن بس.' };
const FAILED: ActionResult = { ok: false, error: 'حصلت مشكلة، جرّب تاني.' };
const RESERVED_SLUGS = new Set(['new', 'daily', 'try', 'admin']);

async function asAdmin() {
  const { userId, profile } = await getSession();
  if (!userId || profile?.role !== 'admin') return null;
  return { userId, supabase: await createClient() };
}

function firstIssue(error: z.ZodError): string {
  const msg = error.issues[0]?.message ?? '';
  return /[\u0600-\u06FF]/.test(msg) ? msg : 'فيه بيانات مش مظبوطة.';
}

function refresh() {
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

const targetSchema = z.object({ grade_id: z.guid(), track_id: z.guid().nullable() });

const gameInput = z.object({
  id: z.guid().optional(),
  type: z.enum(GAME_TYPES),
  title: z.string().trim().min(2, 'اكتب اسم اللعبة.').max(120, 'اسم اللعبة طويل أوي.'),
  description: z.string().trim().max(400, 'الوصف طويل أوي.').default(''),
  topic: z.string().trim().max(40, 'اسم الدرس طويل أوي.').default(''),
  difficulty: z.number().int().min(1).max(3).default(1),
  cover_url: z.string().trim().max(1000).nullable().default(null),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(60, 'الرابط طويل أوي.')
    .refine((s) => s === '' || /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(s), 'الرابط لازم يكون حروف إنجليزي صغيرة وأرقام وشرطة بس.')
    .refine((s) => !RESERVED_SLUGS.has(s), 'الرابط ده محجوز، اختار غيره.')
    .default(''),
  status: z.enum(['draft', 'published']),
  content: z.unknown(),
  settings: z.unknown(),
  targets: z.array(targetSchema).max(200).default([]),
});

export type GameInput = z.input<typeof gameInput>;

/** Keeps only real grade/track pairs and stores "all tracks" as one row with track_id null. */
function normalizeTargets(catalog: Catalog, targets: z.output<typeof targetSchema>[]) {
  const out: { grade_id: string; track_id: string | null }[] = [];
  for (const grade of catalog.grades) {
    const mine = targets.filter((t) => t.grade_id === grade.id);
    if (!mine.length) continue;
    const tracks = new Set(mine.map((t) => t.track_id).filter((t): t is string => Boolean(t) && grade.trackIds.includes(t!)));
    const all = mine.some((t) => t.track_id === null) || grade.trackIds.length <= 1 || grade.trackIds.every((t) => tracks.has(t));
    if (all) out.push({ grade_id: grade.id, track_id: null });
    else for (const t of tracks) out.push({ grade_id: grade.id, track_id: t });
  }
  return out;
}

const newSlug = () => `g-${uid(7)}`;

export async function saveGame(raw: GameInput): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const parsed = gameInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;
  const def = getDef(input.type);

  if (JSON.stringify(input.content ?? null).length > 400_000) return { ok: false, error: 'محتوى اللعبة كبير أوي، قسّمها على كذا لعبة.' };

  const check = checkContent(input.type, input.content);
  if (!check.ok && input.status === 'published') {
    return { ok: false, error: 'فيه حاجات ناقصة في اللعبة، ظبطها الأول قبل ما تنشرها.', errors: check.errors };
  }
  const targets = normalizeTargets(await getCatalog(), input.targets);
  if (input.status === 'published' && targets.length === 0) {
    return { ok: false, error: 'اختار اللعبة هتظهر لأنهي مرحلة قبل ما تنشرها.' };
  }

  const content = check.ok ? check.content : input.content && typeof input.content === 'object' ? input.content : def.defaultContent();
  let itemCount = 0;
  try {
    itemCount = def.itemCount(content);
  } catch {
    itemCount = 0;
  }

  const row = {
    title: input.title,
    description: input.description,
    type: input.type,
    topic: input.topic || null,
    difficulty: input.difficulty,
    cover_url: input.cover_url || null,
    status: input.status,
    content,
    settings: parseSettings(input.settings, input.type),
    item_count: itemCount,
  };

  const { supabase, userId } = ctx;
  let saved: { id: string; slug: string } | null = null;
  for (let attempt = 0; attempt < 4 && !saved; attempt++) {
    const slug = input.slug && attempt === 0 ? input.slug : input.id && !input.slug ? undefined : newSlug();
    const query = input.id
      ? supabase
          .from('games')
          .update(slug ? { ...row, slug } : row)
          .eq('id', input.id)
      : supabase.from('games').insert({ ...row, slug: slug ?? newSlug(), created_by: userId });
    const { data, error } = await query.select('id, slug').maybeSingle();
    if (error?.code === '23505') {
      if (input.slug) return { ok: false, error: 'الرابط ده مستخدم في لعبة تانية، اختار غيره.' };
      continue;
    }
    if (error || !data) {
      console.error('saveGame failed', error);
      return FAILED;
    }
    saved = data as { id: string; slug: string };
  }
  if (!saved) return FAILED;

  const { error: targetError } = await supabase.rpc('set_game_targets', { p_game_id: saved.id, p_targets: targets });
  if (targetError) {
    console.error('set_game_targets failed', targetError);
    return { ok: false, error: 'اللعبة اتحفظت بس المراحل ماتحفظتش، جرّب تحفظ تاني.' };
  }

  refresh();
  return {
    ok: true,
    id: saved.id,
    slug: saved.slug,
    message: input.status === 'published' ? 'اتحفظت واتنشرت للطلاب.' : 'اتحفظت كمسودة.',
    warnings: check.ok ? undefined : check.errors,
  };
}

export async function setGameStatus(id: string, status: 'draft' | 'published'): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { supabase } = ctx;
  if (status === 'published') {
    const [{ data: game }, { count }] = await Promise.all([
      supabase.from('games').select('type, content').eq('id', id).maybeSingle(),
      supabase.from('game_targets').select('id', { count: 'exact', head: true }).eq('game_id', id),
    ]);
    if (!game) return FAILED;
    const check = checkContent(game.type, game.content);
    if (!check.ok) return { ok: false, error: 'اللعبة فيها حاجات ناقصة، افتحها وظبطها الأول.', errors: check.errors };
    if (!count) return { ok: false, error: 'اللعبة مش متحدد لها مرحلة، افتحها واختار المراحل.' };
  }
  const { error } = await supabase.from('games').update({ status }).eq('id', id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: status === 'published' ? 'اتنشرت للطلاب.' : 'اتشالت من عند الطلاب ورجعت مسودة.' };
}

export async function duplicateGame(id: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { supabase, userId } = ctx;
  const [{ data: game }, { data: targets }] = await Promise.all([
    supabase.from('games').select('*').eq('id', id).maybeSingle(),
    supabase.from('game_targets').select('grade_id, track_id').eq('game_id', id),
  ]);
  if (!game) return FAILED;
  const { data, error } = await supabase
    .from('games')
    .insert({
      slug: newSlug(),
      title: `${game.title} (نسخة)`.slice(0, 120),
      description: game.description,
      type: game.type,
      content: game.content,
      settings: game.settings,
      item_count: game.item_count,
      cover_url: game.cover_url,
      topic: game.topic,
      difficulty: game.difficulty,
      status: 'draft',
      created_by: userId,
    })
    .select('id, slug')
    .single();
  if (error || !data) return FAILED;
  await supabase.rpc('set_game_targets', { p_game_id: data.id, p_targets: targets ?? [] });
  refresh();
  return { ok: true, id: data.id, slug: data.slug, message: 'اتعملت نسخة كمسودة.' };
}

export async function deleteGame(id: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { error } = await ctx.supabase.from('games').delete().eq('id', id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'اللعبة اتمسحت.' };
}

// ---------------------------------------------------------------------------
// Grades and tracks
// ---------------------------------------------------------------------------

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/, 'الرابط لازم يكون حروف إنجليزي صغيرة وأرقام وشرطة بس.');

const gradeInput = z.object({
  id: z.guid().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1, 'اكتب اسم المرحلة.').max(40, 'الاسم طويل أوي.'),
  label: z.string().trim().max(30).default('طلاب'),
  subtitle: z.string().trim().max(80).default(''),
  icon: z.string().refine((i) => i in GRADE_ICON_PATHS, 'اختار أيقونة.'),
  active: z.boolean().default(true),
  trackIds: z.array(z.guid()).max(20).default([]),
});

export async function saveGrade(raw: z.input<typeof gradeInput>): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const parsed = gradeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id, trackIds, ...fields } = parsed.data;
  const { supabase } = ctx;

  let gradeId = id;
  if (id) {
    const { error } = await supabase.from('grades').update(fields).eq('id', id);
    if (error) return error.code === '23505' ? { ok: false, error: 'الرابط ده مستخدم لمرحلة تانية.' } : FAILED;
  } else {
    const { data: last } = await supabase.from('grades').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase
      .from('grades')
      .insert({ ...fields, sort_order: (last?.sort_order ?? 0) + 1 })
      .select('id')
      .single();
    if (error) return error.code === '23505' ? { ok: false, error: 'الرابط ده مستخدم لمرحلة تانية.' } : FAILED;
    gradeId = data.id;
  }

  const { data: current } = await supabase.from('grade_tracks').select('track_id').eq('grade_id', gradeId!);
  const have = new Set((current ?? []).map((r) => r.track_id as string));
  const want = new Set(trackIds);
  const remove = [...have].filter((t) => !want.has(t));
  const add = [...want].filter((t) => !have.has(t));
  if (remove.length) await supabase.from('grade_tracks').delete().eq('grade_id', gradeId!).in('track_id', remove);
  if (add.length) await supabase.from('grade_tracks').insert(add.map((track_id) => ({ grade_id: gradeId!, track_id })));

  refresh();
  return { ok: true, id: gradeId, message: id ? 'المرحلة اتعدلت.' : 'المرحلة اتضافت.' };
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { error } = await ctx.supabase.from('grades').delete().eq('id', id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'المرحلة اتمسحت.' };
}

async function swapOrder(table: 'grades' | 'tracks' | 'quotes', id: string, dir: -1 | 1): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { supabase } = ctx;
  const { data: rows } = await supabase.from(table).select('id, sort_order').order('sort_order').order('created_at');
  if (!rows) return FAILED;
  const list = rows.map((r, i) => ({ id: r.id as string, sort_order: i + 1 }));
  const i = list.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  [list[i].sort_order, list[j].sort_order] = [list[j].sort_order, list[i].sort_order];
  const changed = list.filter((r, k) => r.sort_order !== rows[k].sort_order || k === i || k === j);
  const results = await Promise.all(changed.map((r) => supabase.from(table).update({ sort_order: r.sort_order }).eq('id', r.id)));
  if (results.some((r) => r.error)) return FAILED;
  refresh();
  return { ok: true };
}

export async function moveGrade(id: string, dir: -1 | 1) {
  return swapOrder('grades', id, dir);
}

const trackInput = z.object({
  id: z.guid().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1, 'اكتب اسم الشعبة.').max(40, 'الاسم طويل أوي.'),
});

export async function saveTrack(raw: z.input<typeof trackInput>): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const parsed = trackInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id, ...fields } = parsed.data;
  const { supabase } = ctx;
  if (id) {
    const { error } = await supabase.from('tracks').update(fields).eq('id', id);
    if (error) return error.code === '23505' ? { ok: false, error: 'الرابط ده مستخدم لشعبة تانية.' } : FAILED;
  } else {
    const { data: last } = await supabase.from('tracks').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from('tracks').insert({ ...fields, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) return error.code === '23505' ? { ok: false, error: 'الرابط ده مستخدم لشعبة تانية.' } : FAILED;
  }
  refresh();
  return { ok: true, message: id ? 'الشعبة اتعدلت.' : 'الشعبة اتضافت.' };
}

export async function deleteTrack(id: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { error } = await ctx.supabase.from('tracks').delete().eq('id', id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'الشعبة اتمسحت.' };
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

/** A grade with one track gets that track; a grade with several needs one of them. */
async function resolveTrack(gradeId: string | null, trackId: string | null) {
  if (!gradeId) return { grade_id: null, track_id: null } as const;
  const grade = (await getCatalog()).grades.find((g) => g.id === gradeId);
  if (!grade) return { error: 'المرحلة دي مش موجودة.' } as const;
  if (grade.trackIds.length === 0) return { grade_id: grade.id, track_id: null } as const;
  if (grade.trackIds.length === 1) return { grade_id: grade.id, track_id: grade.trackIds[0] } as const;
  if (!trackId) return { error: 'اختار الشعبة.' } as const;
  if (!grade.trackIds.includes(trackId)) return { error: 'الشعبة دي مش تبع المرحلة دي.' } as const;
  return { grade_id: grade.id, track_id: trackId } as const;
}

const studentInput = z.object({
  full_name: z.string().trim().min(2, 'اكتب الاسم.').max(60, 'الاسم طويل أوي.'),
  phone: z.string().trim().max(20).default(''),
  grade_id: z.guid().nullable(),
  track_id: z.guid().nullable(),
});

export async function updateStudent(id: string, raw: z.input<typeof studentInput>): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const parsed = studentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { full_name, phone } = parsed.data;
  const placed = await resolveTrack(parsed.data.grade_id, parsed.data.track_id);
  if ('error' in placed) return { ok: false, error: placed.error! };
  const phoneValue = phone ? normalizePhone(phone) : null;
  if (phone && !phoneValue) return { ok: false, error: 'رقم الموبايل مش مظبوط.' };
  const { error } = await ctx.supabase
    .from('profiles')
    .update({ full_name: full_name.replace(/\s+/g, ' '), phone: phoneValue, grade_id: placed.grade_id, track_id: placed.track_id })
    .eq('id', id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'بيانات الطالب اتعدلت.' };
}

const newStudentInput = z.object({
  full_name: z.string().trim().min(2, 'اكتب اسم الطالب.').max(60, 'الاسم طويل أوي.'),
  identifier: z.string().trim().min(1, 'اكتب رقم الموبايل أو الإيميل.'),
  password: z.string().min(6, 'كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل.').max(72, 'كلمة السر طويلة أوي.'),
  grade_id: z.guid({ error: 'اختار المرحلة.' }),
  track_id: z.guid().nullable(),
});

export async function createStudent(raw: z.input<typeof newStudentInput>): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const parsed = newStudentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;
  const id = parseIdentifier(input.identifier);
  if (!id) return { ok: false, error: 'اكتب رقم موبايل مصري صحيح (زي 01012345678) أو إيميل صحيح.' };
  const placed = await resolveTrack(input.grade_id, input.track_id);
  if ('error' in placed) return { ok: false, error: placed.error! };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: 'لازم تظبط SUPABASE_SERVICE_ROLE_KEY عشان تعمل حسابات.' };
  const { data, error } = await admin.auth.admin.createUser({
    email: id.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name.replace(/\s+/g, ' '),
      phone: id.kind === 'phone' ? id.phone : null,
      grade_id: placed.grade_id,
      track_id: placed.track_id,
    },
  });
  if (error || !data.user) return { ok: false, error: authErrorMessage(error) };
  refresh();
  return {
    ok: true,
    id: data.user.id,
    message: `الحساب اتعمل. الطالب يدخل بـ ${id.kind === 'phone' ? id.phone : id.email} وكلمة السر اللي كتبتها.`,
  };
}

export async function setUserRole(id: string, role: 'student' | 'admin'): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { error } = await ctx.supabase.rpc('set_user_role', { p_user_id: id, p_role: role });
  if (error) {
    if (error.message.includes('cannot_demote_self')) return { ok: false, error: 'مينفعش تشيل الأدمن من نفسك.' };
    return FAILED;
  }
  refresh();
  return { ok: true, message: role === 'admin' ? 'بقى أدمن.' : 'رجع طالب.' };
}

export async function resetStudentPassword(id: string, password: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  if (password.length < 6) return { ok: false, error: 'كلمة السر لازم تبقى ٦ حروف على الأقل.' };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: 'لازم تظبط SUPABASE_SERVICE_ROLE_KEY عشان تغيّر كلمة السر.' };
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return FAILED;
  return { ok: true, message: 'كلمة السر اتغيرت. ابعتها للطالب.' };
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  if (id === ctx.userId) return { ok: false, error: 'مينفعش تمسح حسابك من هنا.' };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: 'لازم تظبط SUPABASE_SERVICE_ROLE_KEY عشان تمسح حساب.' };
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'الحساب اتمسح.' };
}

export async function deleteAttempt(attemptId: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { error } = await ctx.supabase.from('attempts').delete().eq('id', attemptId);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'المحاولة اتمسحت والنقط اتحسبت من جديد.' };
}

export async function clearStudentAttempts(userId: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { error } = await ctx.supabase.from('attempts').delete().eq('user_id', userId);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'كل محاولات الطالب اتمسحت ونقطه بقت صفر.' };
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

const quoteInput = z.object({
  id: z.guid().optional(),
  text: z.string().trim().min(3, 'اكتب الجملة.').max(200, 'الجملة طويلة أوي.'),
  active: z.boolean().default(true),
});

export async function saveQuote(raw: z.input<typeof quoteInput>): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const parsed = quoteInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id, ...fields } = parsed.data;
  const { supabase } = ctx;
  if (id) {
    const { error } = await supabase.from('quotes').update(fields).eq('id', id);
    if (error) return FAILED;
  } else {
    const { data: last } = await supabase.from('quotes').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from('quotes').insert({ ...fields, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) return FAILED;
  }
  refresh();
  return { ok: true, message: id ? 'الجملة اتعدلت.' : 'الجملة اتضافت.' };
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const ctx = await asAdmin();
  if (!ctx) return NOT_ADMIN;
  const { error } = await ctx.supabase.from('quotes').delete().eq('id', id);
  if (error) return FAILED;
  refresh();
  return { ok: true, message: 'الجملة اتمسحت.' };
}

export async function moveQuote(id: string, dir: -1 | 1) {
  return swapOrder('quotes', id, dir);
}
