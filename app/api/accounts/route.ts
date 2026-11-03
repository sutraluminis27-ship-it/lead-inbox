import { NextResponse } from 'next/server';
import { authed, unauthorized } from '@/lib/auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  if (!authed(req)) return unauthorized();
  return NextResponse.json(await prisma.account.findMany({ select: { id: true, email: true, lastSyncAt: true, active: true, _count: { select: { leads: true } } } }));
}
