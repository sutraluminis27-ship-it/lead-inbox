import { NextResponse } from 'next/server';
import { verify } from '@/lib/auth';
import { connectAccount } from '@/lib/gmail';
export const dynamic = 'force-dynamic';
// Google redirects the browser here (no Authorization header), so the signed `state` proves who started it.
export async function GET(req: Request) {
  const u = new URL(req.url);
  try {
    if (!verify(u.searchParams.get('state') || '')) throw new Error('Invalid state. Start again from the dashboard.');
    const acc = await connectAccount(u.searchParams.get('code') || '');
    return NextResponse.redirect(new URL('/?connected=' + encodeURIComponent(acc.email), req.url));
  } catch (e: any) { return NextResponse.redirect(new URL('/?error=' + encodeURIComponent(e.message), req.url)); }
}
