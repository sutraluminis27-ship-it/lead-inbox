export interface Msg { id: string; from: string; replyTo?: string; subject: string; date: Date; body: string; bulk: boolean }

const NOISE = /no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|bounce/i;

export function extractLead(m: Msg) {
  if (m.bulk) return null; // newsletters / auto-generated mail
  const src = m.replyTo || m.from;
  const parts = src.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  let name = parts?.[1]?.trim() || '';
  let email = (parts?.[2] || src).trim().toLowerCase();
  if (NOISE.test(email)) return null;

  const body = m.body.split('\n').filter(l => !l.startsWith('>')).join('\n').trim();
  // Supports web-form style bodies: "Name: John", "Phone: +91 ..."
  const label = (k: string) => body.match(new RegExp(`^\\s*${k}\\s*[:\\-]\\s*(.+)$`, 'im'))?.[1]?.trim();

  name = label('(?:full |your )?name') || name || email.split('@')[0];
  email = label('e-?mail')?.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0]?.toLowerCase() || email;
  const phone =
    label('(?:phone|mobile|contact|whatsapp)(?: ?(?:no\\.?|number))?') ||
    body.match(/(\+?\d[\d\s().-]{8,14}\d)/)?.[1];

  return { name, email, phone: phone?.trim() || null, subject: m.subject || '(no subject)', enquiry: body.slice(0, 2000) };
}
