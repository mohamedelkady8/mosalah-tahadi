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

const cairoInputFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** ISO time -> "YYYY-MM-DDTHH:mm" in Egypt, the value a datetime-local input expects. */
export function isoToCairoInput(value: string | null | undefined): string {
  if (!value) return '';
  const parts = Object.fromEntries(cairoInputFmt.formatToParts(new Date(value)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "YYYY-MM-DDTHH:mm" typed as Egypt time -> ISO time, whatever the browser's own timezone is. */
export function cairoInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let ts = wall - cairoOffsetMinutes(new Date(wall)) * 60000;
  ts = wall - cairoOffsetMinutes(new Date(ts)) * 60000;
  return new Date(ts).toISOString();
}

const longDayFmt = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' });
const dayKeyFmt = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const whenFmt = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' });

/** "الخميس، ١٢ نوفمبر ٢٠٢٦" */
export function formatLongDay(value: string | Date = new Date()): string {
  return longDayFmt.format(new Date(value));
}

/** A date column ("2026-11-12") as "الخميس، ١٢ نوفمبر". */
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKeyFmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** "الخميس، ١٢ نوفمبر، ٨:٠٠ م" in Egypt time. */
export function formatWhen(value: string | Date): string {
  return whenFmt.format(new Date(value));
}

/** "٢ يوم و٣ ساعات" / "٣ ساعات و١٠ دقايق" / "٥ دقايق" until a moment. */
export function timeLeftText(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const days = countLabel(d, { one: 'يوم', two: 'يومين', few: 'أيام', many: 'يوم' });
  const hours = countLabel(h, { one: 'ساعة', two: 'ساعتين', few: 'ساعات', many: 'ساعة' });
  const mins = countLabel(m, { one: 'دقيقة', two: 'دقيقتين', few: 'دقايق', many: 'دقيقة' });
  if (d) return h ? `${days} و${hours}` : days;
  if (h) return m ? `${hours} و${mins}` : hours;
  return mins;
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
