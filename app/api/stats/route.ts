import { NextResponse } from 'next/server';
import { authed, unauthorized } from '@/lib/auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  if (!authed(req)) return unauthorized();
  const since = new Date(Date.now() - 13 * 86400000); since.setUTCHours(0, 0, 0, 0);
  const [rows, accounts, total] = await Promise.all([
    prisma.lead.findMany({ where: { receivedAt: { gte: since } }, select: { receivedAt: true } }),
    prisma.account.findMany({ select: { email: true, _count: { select: { leads: true } } } }),
    prisma.lead.count(),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => ({ date: new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10), count: 0 }));
  rows.forEach(r => { const d = days.find(x => x.date === r.receivedAt.toISOString().slice(0, 10)); if (d) d.count++; });
  return NextResponse.json({ days, total, today: days[13].count, byAccount: accounts.map(a => ({ email: a.email, count: a._count.leads })).sort((a, b) => b.count - a.count) });
}
