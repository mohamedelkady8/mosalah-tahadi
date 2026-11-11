const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
const TATWEEL = /\u0640/g;
const COMBINING = /^[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]$/;

export function stripDiacritics(value: string): string {
  return value.replace(DIACRITICS, '').replace(TATWEEL, '');
}

export function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Used when comparing typed answers: trims, collapses spaces and optionally ignores tashkeel. */
export function normalizeAnswer(value: string, ignoreDiacritics = true): string {
  let v = normalizeSpaces(value.normalize('NFC'));
  if (ignoreDiacritics) v = stripDiacritics(v);
  return v;
}

/** Splits text into letters, keeping each letter's tashkeel attached to it. */
export function graphemes(value: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(value)) {
    if (COMBINING.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

export function words(value: string): string[] {
  return normalizeSpaces(value).split(' ').filter(Boolean);
}

export type BlankPart = { kind: 'text'; text: string } | { kind: 'blank'; index: number; answers: string[] };

/** "ذهب [[الطالب|الطالبُ]] إلى المدرسة" -> text and blank parts. Alternatives are separated by "|". */
export function parseBlanks(text: string): BlankPart[] {
  const parts: BlankPart[] = [];
  const re = /\[\[([^\]]*?)\]\]/g;
  let last = 0;
  let index = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ kind: 'text', text: text.slice(last, m.index) });
    parts.push({
      kind: 'blank',
      index: index++,
      answers: m[1]
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

export function blanksOf(text: string): string[][] {
  return parseBlanks(text)
    .filter((p): p is Extract<BlankPart, { kind: 'blank' }> => p.kind === 'blank')
    .map((p) => p.answers);
}

/** Text with each blank replaced by a line, for review lists. */
export function blankedText(text: string): string {
  return parseBlanks(text)
    .map((p) => (p.kind === 'text' ? p.text : ' ____ '))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export type RichPart = { text: string; style: 'plain' | 'mark' | 'under' };

/** "فقد تقودك أفكار [أُخَر] إلى «حلّ»" -> plain, underlined ([ ]) and highlighted (« ») parts. */
export function richParts(text: string): RichPart[] {
  const parts: RichPart[] = [];
  const re = /\[([^\]\n]+)\]|«([^»]*)»/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), style: 'plain' });
    parts.push(m[1] !== undefined ? { text: m[1], style: 'under' } : { text: m[2], style: 'mark' });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), style: 'plain' });
  return parts;
}

/** Splits "كتبَ «الطالبُ» الدرسَ" into plain and highlighted parts. */
export function highlightParts(text: string): { text: string; mark: boolean }[] {
  const parts: { text: string; mark: boolean }[] = [];
  const re = /«([^»]*)»/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), mark: false });
    parts.push({ text: m[1], mark: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mark: false });
  return parts;
}
