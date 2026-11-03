import { NextResponse } from 'next/server';
import { authed, unauthorized } from '@/lib/auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  if (!authed(req)) return unauthorized();
  const p = new URL(req.url).searchParams;
  const status = p.get('status'), accountId = p.get('accountId'), q = p.get('q'), page = Number(p.get('page') || 1);
  const where: any = {
    ...(status && { status }), ...(accountId && { accountId }),
    ...(q && { OR: ['name', 'email', 'phone', 'subject', 'remarks'].map(f => ({ [f]: { contains: q, mode: 'insensitive' } })) }),
  };
  const take = 50;
  const [items, total, counts] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { receivedAt: 'desc' }, take, skip: (page - 1) * take, include: { account: { select: { email: true } } } }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ['status'], _count: true }),
  ]);
  return NextResponse.json({ items, total, pages: Math.ceil(total / take), counts: Object.fromEntries(counts.map(c => [c.status, c._count])) });
}
