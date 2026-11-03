import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncAccount } from '@/lib/sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// Called every minute by Supabase pg_cron. Checks all active mailboxes in parallel.
async function run(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accounts = await prisma.account.findMany({ where: { active: true }, select: { id: true, email: true } });
  const results = await Promise.allSettled(accounts.map(a => syncAccount(a.id)));
  results.forEach((r, i) => r.status === 'rejected' && console.error('sync failed', accounts[i].email, r.reason?.message));
  return NextResponse.json({ accounts: accounts.length, failed: results.filter(r => r.status === 'rejected').length });
}
export { run as GET, run as POST };
