import { prisma } from './db';
import { scan } from './gmail';
import { extractLead } from './extract';
import { notifyLead } from './notify';

export async function syncAccount(id: string, deadline = Date.now() + 50_000) {
  const acc = await prisma.account.findUnique({ where: { id } });
  if (!acc || !acc.active) return;
  const started = new Date();
  const finished = await scan(acc, deadline, async m => {
    const lead = extractLead(m);
    if (!lead) return;
    try {
      const saved = await prisma.lead.create({ data: { ...lead, accountId: acc.id, messageId: m.id, receivedAt: m.date } });
      await notifyLead(saved, acc.email);
    } catch (e: any) { if (e.code !== 'P2002') throw e; } // already stored
  });
  if (finished) await prisma.account.update({ where: { id }, data: { lastSyncAt: started } }); // else resume next minute
}
