import 'server-only';

const PHONE_DOMAIN = (process.env.PHONE_EMAIL_DOMAIN || 'students.hamthalah.app').toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Converts Arabic-Indic and Persian digits to ASCII digits. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizePhone(raw: string): string | null {
  let digits = normalizeDigits(raw).replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith('0020')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('20') && digits.length === 12) digits = `0${digits.slice(2)}`;
  else if (digits.length === 10 && digits.startsWith('1')) digits = `0${digits}`;
  if (/^01[0125]\d{8}$/.test(digits)) return digits;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

export type Identifier = { kind: 'email'; email: string } | { kind: 'phone'; email: string; phone: string };

/** A student logs in with either a phone number or an email. Phones map to an internal email. */
export function parseIdentifier(raw: string): Identifier | null {
  const value = normalizeDigits(raw.trim());
  if (!value) return null;
  if (value.includes('@')) {
    const email = value.toLowerCase();
    return EMAIL_RE.test(email) ? { kind: 'email', email } : null;
  }
  const phone = normalizePhone(value);
  return phone ? { kind: 'phone', phone, email: `${phone}@${PHONE_DOMAIN}` } : null;
}

/** What to show as the student's contact: the phone for phone accounts, otherwise the email. */
export function displayContact(email: string | null, phone: string | null): string {
  if (phone) return phone;
  if (!email) return '';
  if (email.endsWith(`@${PHONE_DOMAIN}`)) return email.split('@')[0];
  return email;
}

export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string') return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}
