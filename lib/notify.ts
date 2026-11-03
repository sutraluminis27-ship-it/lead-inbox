import nodemailer from 'nodemailer';

export async function notifyLead(l: { id: number; name: string; email: string; phone: string | null; subject: string }, account: string) {
  const text = `New lead #${l.id} via ${account}\n${l.name} | ${l.phone ?? 'no phone'} | ${l.email}\n${l.subject}`;
  const e = process.env;
  if (e.SLACK_WEBHOOK_URL)
    await fetch(e.SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).catch(console.error);
  if (e.SMTP_HOST && e.NOTIFY_TO)
    await nodemailer.createTransport({ host: e.SMTP_HOST, port: Number(e.SMTP_PORT || 587), auth: { user: e.SMTP_USER, pass: e.SMTP_PASS } })
      .sendMail({ from: e.SMTP_USER, to: e.NOTIFY_TO, subject: `New lead: ${l.name}`, text }).catch(console.error);
}
