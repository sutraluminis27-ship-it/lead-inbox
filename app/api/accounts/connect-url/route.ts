import { NextResponse } from 'next/server';
import { authed, sign, unauthorized } from '@/lib/auth';
import { authUrl } from '@/lib/gmail';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  if (!authed(req)) return unauthorized();
  return NextResponse.json({ url: authUrl(sign({ c: 1 }, '10m')) });
}
