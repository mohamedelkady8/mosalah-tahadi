const numberFmt = new Intl.NumberFormat('ar-EG');
const dateFmt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeZone: 'Africa/Cairo' });
const dateTimeFmt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });
const cairoDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Eastern Arabic digits, like the rest of the site (٣ ثانوي). */
export function num(n: number): string {
  return numberFmt.format(n);
}

export function percent(score: number, max: number): number {
  if (!max) return 0;
  return Math.round((score * 100) / max);
}

export function pct(score: number, max: number): string {
  return `${num(percent(score, max))}٪`;
}

export function formatDate(value: string | Date): string {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFmt.format(new Date(value));
}

/** "2:05" style clock with Arabic digits. */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${num(m)}:${r < 10 ? num(0) : ''}${num(r)}`;
}

export function durationText(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${num(s)} ثانية`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${num(m)} دقيقة و${num(r)} ثانية` : `${num(m)} دقيقة`;
}

export function timeAgo(value: string | Date, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(value).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'دلوقتي';
  if (min < 60) return `من ${num(min)} دقيقة`;
  const h = Math.floor(min / 60);
  if (h < 24) return `من ${num(h)} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `من ${num(d)} يوم`;
  return formatDate(value);
}

/** Day key (YYYY-MM-DD) in Egypt's timezone. */
export function cairoDayKey(date: Date | string = new Date()): string {
  return cairoDayFmt.format(new Date(date));
}

const cairoOffsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'longOffset' });

function cairoOffsetMinutes(date: Date): number {
  const name = cairoOffsetFmt.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(name);
  if (!m) return 120;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Midnight in Egypt (start of the Egyptian day), `daysAgo` days back. */
export function cairoStartOfDay(date: Date = new Date(), daysAgo = 0): Date {
  const [y, m, d] = cairoDayKey(date).split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d - daysAgo);
  return new Date(utcMidnight - cairoOffsetMinutes(new Date(utcMidnight)) * 60000);
}

/** Days since epoch for the current Egyptian date. Same formula as the original daily quote. */
export function cairoDayNumber(date: Date = new Date()): number {
  const [y, m, d] = cairoDayKey(date).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * Arabic counting forms: 1 سؤال, 2 سؤالين, 3-10 أسئلة, 11+ سؤال.
 */
export function countLabel(n: number, forms: { one: string; two: string; few: string; many: string }): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const mod = n % 100;
  if (mod >= 3 && mod <= 10) return `${num(n)} ${forms.few}`;
  return `${num(n)} ${forms.many}`;
}

export const DIFFICULTY_LABELS: Record<number, string> = { 1: 'سهلة', 2: 'متوسطة', 3: 'صعبة' };

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
