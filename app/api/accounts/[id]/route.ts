import { NextResponse } from 'next/server';
import { authed, unauthorized } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return unauthorized();
  await prisma.account.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
