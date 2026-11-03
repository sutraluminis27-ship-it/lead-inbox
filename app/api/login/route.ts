import { NextResponse } from 'next/server';
import { sign } from '@/lib/auth';
export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== process.env.APP_PASSWORD) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  return NextResponse.json({ token: sign({ role: 'admin' }, '7d') });
}
