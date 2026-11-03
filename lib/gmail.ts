import { google } from 'googleapis';
import type { Account } from '@prisma/client';
import { prisma } from './db';
import type { Msg } from './extract';

const client = () => new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

export const authUrl = (state: string) =>
  client().generateAuthUrl({
    access_type: 'offline', prompt: 'consent', state,
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.email'],
  });

export async function connectAccount(code: string) {
  const c = client();
  const { tokens } = await c.getToken(code);
  if (!tokens.refresh_token) throw new Error('No refresh token returned. Remove the app at myaccount.google.com/permissions and retry.');
  c.setCredentials(tokens);
  const { data } = await google.oauth2({ version: 'v2', auth: c }).userinfo.get();
  return prisma.account.upsert({
    where: { email: data.email! },
    update: { refreshToken: tokens.refresh_token, active: true },
    create: { email: data.email!, refreshToken: tokens.refresh_token },
  });
}

const decode = (s?: string | null) => (s ? Buffer.from(s, 'base64url').toString('utf8') : '');
function bodyOf(p: any): string {
  if (!p) return '';
  if (p.mimeType === 'text/plain' && p.body?.data) return decode(p.body.data);
  for (const part of p.parts || []) { const t = bodyOf(part); if (t) return t; }
  if (p.mimeType === 'text/html' && p.body?.data) return decode(p.body.data).replace(/<(br|\/p|\/div|\/tr)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  return '';
}

/** Streams new inbox messages to `handle`. Returns false if it ran out of time before finishing. */
export async function scan(acc: Account, deadline: number, handle: (m: Msg) => Promise<void>): Promise<boolean> {
  const auth = client();
  auth.setCredentials({ refresh_token: acc.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth });
  const since = acc.lastSyncAt ? acc.lastSyncAt.getTime() - 10 * 60_000 : Date.now() - 3 * 86_400_000; // overlap; DB dedupes
  const q = `in:inbox after:${Math.floor(since / 1000)} -from:me -category:promotions -category:social -category:forums`;
  let pageToken: string | undefined;
  do {
    const { data } = await gmail.users.messages.list({ userId: 'me', q, maxResults: 50, pageToken });
    const ids = (data.messages || []).map(m => m.id!);
    const known = new Set((await prisma.lead.findMany({ where: { accountId: acc.id, messageId: { in: ids } }, select: { messageId: true } })).map(l => l.messageId));
    for (const id of ids) {
      if (known.has(id)) continue;
      if (Date.now() > deadline) return false;
      const { data: m } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const h = (n: string) => m.payload?.headers?.find(x => x.name?.toLowerCase() === n)?.value || '';
      await handle({
        id, from: h('from'), replyTo: h('reply-to') || undefined, subject: h('subject'),
        date: new Date(Number(m.internalDate)), body: bodyOf(m.payload),
        bulk: !!h('list-unsubscribe') || /auto-(generated|replied)|bulk|junk/i.test(h('auto-submitted') + h('precedence')),
      });
    }
    pageToken = data.nextPageToken || undefined;
  } while (pageToken);
  return true;
}
