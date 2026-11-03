import { NextResponse } from 'next/server';
import { authed, unauthorized } from '@/lib/auth';
import { syncAccount } from '@/lib/sync';
export const maxDuration = 60;
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!authed(req)) return unauthorized();
  await syncAccount(params.id);
  return NextResponse.json({ ok: true });
}
