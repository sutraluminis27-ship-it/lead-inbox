import { NextResponse } from 'next/server';
import { authed, unauthorized } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return unauthorized();
  const { status, assignedTo, remarks, followUpAt } = await req.json();
  return NextResponse.json(await prisma.lead.update({ where: { id: Number(params.id) }, data: { status, assignedTo, remarks, followUpAt } }));
}
