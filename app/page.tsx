'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';

const STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'CLOSED'] as const;
const LABEL: Record<string, string> = { NEW: 'New', CONTACTED: 'Contacted', FOLLOW_UP: 'Follow-up', CLOSED: 'Closed' };
const COLOR: Record<string, string> = { NEW: '#b8975a', CONTACTED: '#3f6f9a', FOLLOW_UP: '#c0623f', CLOSED: '#4d7c63' };

type Lead = { id: number; receivedAt: string; account: { email: string }; name: string; phone: string | null; email: string; subject: string; enquiry: string; status: string; assignedTo: string | null; remarks: string | null };
type Account = { id: string; email: string; lastSyncAt: string | null; _count: { leads: number } };
type Stats = { days: { date: string; count: number }[]; total: number; today: number; byAccount: { email: string; count: number }[] };

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` } });
  if (r.status === 401) { localStorage.removeItem('token'); location.reload(); }
  return r.json();
}
const ago = (d?: string | null) => {
  if (!d) return 'never';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};
const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const Crown = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 48 30" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 10l9 7 12-14 12 14 9-7-4 18H7z" /></svg>
);

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  const go = async () => {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const d = await r.json();
    if (d.token) { localStorage.setItem('token', d.token); onDone(); } else setErr(d.error || 'Could not sign in');
  };
  return (
    <main className="min-h-screen bg-navy grid place-items-center p-4">
      <div className="w-full max-w-md text-center rise">
        <img src="/logo.jpeg" alt="Sutra Luminis: Lighting, Décor, Furniture" className="w-full rounded-lg" />
        <h1 className="font-serif text-4xl text-gold mt-6 font-semibold">Email Tracker</h1>
        <p className="text-gold/70 text-sm mt-1">Every enquiry, from every inbox, in one place.</p>
        <div className="mt-6 space-y-3">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="Password"
            className="w-full rounded-lg bg-navy2 border border-gold/30 text-white placeholder:text-white/40 px-4 py-3" />
          {err && <p className="text-sm text-red-300">{err}</p>}
          <button onClick={go} className="w-full rounded-lg bg-gold text-navy font-semibold py-3 hover:bg-white transition-colors">Sign in</button>
        </div>
      </div>
    </main>
  );
}

function Bars({ days }: { days: Stats['days'] }) {
  const max = Math.max(1, ...days.map(d => d.count));
  return (
    <div className="flex items-stretch gap-1.5 h-44">
      {days.map(d => (
        <div key={d.date} className="flex-1 flex flex-col group" title={`${d.date}: ${d.count} leads`}>
          <div className="text-[11px] text-center text-ink/70 h-4 opacity-0 group-hover:opacity-100">{d.count}</div>
          <div className="flex-1 flex items-end">
            <div className="w-full rounded-t-md bg-gradient-to-t from-golddeep to-gold" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 6 : 2, opacity: d.count ? 1 : 0.4 }} />
          </div>
          <div className="text-[10px] text-center text-ink/50 pt-1">{new Date(d.date).getUTCDate()}</div>
        </div>
      ))}
    </div>
  );
}

function Donut({ counts, total }: { counts: Record<string, number>; total: number }) {
  let acc = 0;
  return (
    <div className="relative w-40 h-40 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#ece5d8" strokeWidth="4" />
        {STATUSES.map(s => {
          const p = total ? ((counts[s] || 0) / total) * 100 : 0;
          const el = <circle key={s} cx="18" cy="18" r="15.9155" fill="none" stroke={COLOR[s]} strokeWidth="4" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-acc} />;
          acc += p; return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="font-serif text-4xl font-semibold leading-none">{total}</div><div className="text-xs text-ink/60 mt-1">total leads</div></div>
      </div>
    </div>
  );
}

export default function Page() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [f, setF] = useState({ status: '', accountId: '', q: '', page: 1 });
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ ...f, page: String(f.page) } as any);
    const [l, a, s] = await Promise.all([api('/api/leads?' + qs), api('/api/accounts'), api('/api/stats')]);
    setLeads(l.items || []); setCounts(l.counts || {}); setPages(l.pages || 1);
    setAccounts(Array.isArray(a) ? a : []); if (s?.days) setStats(s);
  }, [f]);

  useEffect(() => {
    setAuthed(!!localStorage.getItem('token'));
    const p = new URLSearchParams(location.search);
    if (p.get('connected')) setNote({ ok: true, text: `Connected ${p.get('connected')}. New enquiries will appear within a minute.` });
    if (p.get('error')) setNote({ ok: false, text: p.get('error')! });
    if (p.toString()) history.replaceState(null, '', '/');
  }, []);
  useEffect(() => { if (authed) { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); } }, [authed, load]);

  const patch = async (id: number, body: Partial<Lead>) => { await api('/api/leads/' + id, { method: 'PATCH', body: JSON.stringify(body) }); load(); };
  const connect = async () => { const { url } = await api('/api/accounts/connect-url'); location.href = url; };

  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const total = STATUSES.reduce((n, s) => n + (counts[s] || 0), 0);
  const maxMail = Math.max(1, ...(stats?.byAccount.map(a => a.count) || [1]));
  const inp = 'rounded-lg border border-line bg-white px-3 py-2 text-sm';
  const card = 'rounded-2xl bg-white border border-line p-5 shadow-[0_1px_0_rgba(33,38,56,0.04)]';

  return (
    <div className="min-h-screen">
      <header className="bg-navy text-white">
        <div className="max-w-[1400px] mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Crown className="w-10 text-gold" />
            <div>
              <h1 className="font-serif text-3xl font-semibold leading-none">Sutra Email Tracker</h1>
              <p className="text-gold/70 text-xs mt-1 tracking-wide">Lighting | Décor | Furniture</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={connect} className="rounded-lg bg-gold text-navy font-semibold px-4 py-2 text-sm hover:bg-white transition-colors">Connect mailbox</button>
            <button onClick={() => { localStorage.removeItem('token'); location.reload(); }} className="rounded-lg border border-gold/40 text-gold px-3 py-2 text-sm hover:bg-navy2">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-5 space-y-5">
        {note && <div className={`rounded-xl px-4 py-3 text-sm flex justify-between ${note.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>{note.text}<button onClick={() => setNote(null)} aria-label="Dismiss">✕</button></div>}

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-navy text-white p-5">
            <div className="text-gold/80 text-sm">Total leads</div>
            <div className="font-serif text-5xl font-semibold mt-1">{stats?.total ?? total}</div>
            <div className="text-gold text-xs mt-2">{stats?.today ?? 0} received today</div>
          </div>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setF({ ...f, status: f.status === s ? '' : s, page: 1 })}
              className={`text-left rounded-2xl bg-white p-5 border-2 transition-colors ${f.status === s ? '' : 'border-line hover:border-gold'}`} style={f.status === s ? { borderColor: COLOR[s] } : undefined}>
              <div className="flex items-center gap-2 text-sm text-ink/70"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR[s] }} />{LABEL[s]}</div>
              <div className="font-serif text-5xl font-semibold mt-1">{counts[s] || 0}</div>
              <div className="text-xs text-ink/50 mt-2">{f.status === s ? 'Filter on. Click to clear' : 'Click to filter'}</div>
            </button>
          ))}
        </section>

        <section className="grid lg:grid-cols-3 gap-3">
          <div className={card + ' lg:col-span-2'}>
            <h2 className="font-serif text-2xl font-semibold mb-3">Leads, last 14 days</h2>
            {stats ? <Bars days={stats.days} /> : <div className="h-44" />}
          </div>
          <div className={card}>
            <h2 className="font-serif text-2xl font-semibold mb-3">Pipeline</h2>
            <div className="flex items-center gap-4">
              <Donut counts={counts} total={total} />
              <ul className="text-sm space-y-2">{STATUSES.map(s => <li key={s} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR[s] }} />{LABEL[s]} <b className="ml-auto pl-3">{counts[s] || 0}</b></li>)}</ul>
            </div>
          </div>
        </section>

        <section className={card}>
          <div className="flex items-center justify-between mb-3"><h2 className="font-serif text-2xl font-semibold">Mailboxes</h2><span className="text-xs text-ink/50">{accounts.length} connected</span></div>
          {accounts.length === 0 && <p className="text-sm text-ink/60">No mailboxes yet. Use <b>Connect mailbox</b> to add your first inbox.</p>}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3">
            {accounts.map(a => {
              const n = stats?.byAccount.find(x => x.email === a.email)?.count ?? a._count.leads;
              const fresh = a.lastSyncAt && Date.now() - new Date(a.lastSyncAt).getTime() < 10 * 60_000;
              return (
                <div key={a.id}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${fresh ? 'bg-emerald-500' : 'bg-amber-500'}`} title={fresh ? 'Syncing normally' : 'No recent sync'} />
                    <span className="truncate font-medium">{a.email}</span>
                    <span className="ml-auto text-xs text-ink/50 whitespace-nowrap">{ago(a.lastSyncAt)}</span>
                    <button onClick={() => api(`/api/accounts/${a.id}/sync`, { method: 'POST' }).then(load)} className="text-xs rounded-md border border-line px-2 py-0.5 hover:border-gold">Sync</button>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-ivory"><div className="h-full rounded-full bg-gradient-to-r from-golddeep to-gold" style={{ width: `${(n / maxMail) * 100}%` }} /></div>
                  <div className="text-[11px] text-ink/50 mt-1">{n} leads</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          <input className={inp + ' flex-1 min-w-[220px]'} placeholder="Search name, email, phone, remarks" value={f.q} onChange={e => setF({ ...f, q: e.target.value, page: 1 })} />
          <select className={inp} value={f.accountId} onChange={e => setF({ ...f, accountId: e.target.value, page: 1 })}>
            <option value="">All mailboxes</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
          </select>
          {(f.status || f.accountId || f.q) && <button onClick={() => setF({ status: '', accountId: '', q: '', page: 1 })} className={inp + ' hover:border-gold'}>Clear filters</button>}
        </section>

        <div className="overflow-x-auto rounded-2xl bg-white border border-line">
          <table className="w-full text-sm">
            <thead className="bg-navy text-gold text-left"><tr>{['ID', 'Received', 'Mailbox', 'Customer', 'Phone', 'Status', 'Assigned to', 'Remarks'].map(h => <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {leads.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-ink/60">No leads match these filters. New enquiries appear here within a minute of arriving.</td></tr>}
              {leads.map(l => (
                <Fragment key={l.id}>
                  <tr className="border-t border-line align-top hover:bg-ivory/60">
                    <td className="px-4 py-3"><button onClick={() => setOpen(open === l.id ? null : l.id)} className="font-semibold text-golddeep underline underline-offset-2">#{l.id}</button></td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(l.receivedAt)}<div className="text-xs text-ink/50">{ago(l.receivedAt)}</div></td>
                    <td className="px-4 py-3 text-ink/70">{l.account.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-navy text-gold grid place-items-center font-serif font-semibold shrink-0">{l.name.charAt(0).toUpperCase()}</span>
                        <div><div className="font-semibold">{l.name}</div><a className="text-xs text-golddeep hover:underline" href={`mailto:${l.email}`}>{l.email}</a></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{l.phone ? <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="hover:underline">{l.phone}</a> : <span className="text-ink/40">Not found</span>}</td>
                    <td className="px-4 py-3">
                      <select value={l.status} onChange={e => patch(l.id, { status: e.target.value })} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ background: COLOR[l.status] + '1f', color: COLOR[l.status], borderColor: COLOR[l.status] + '66' }}>
                        {STATUSES.map(s => <option key={s} value={s}>{LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><input defaultValue={l.assignedTo || ''} placeholder="Assign" onBlur={e => e.target.value !== (l.assignedTo || '') && patch(l.id, { assignedTo: e.target.value })} className={inp + ' w-32'} /></td>
                    <td className="px-4 py-3"><input defaultValue={l.remarks || ''} placeholder="Add a remark" onBlur={e => e.target.value !== (l.remarks || '') && patch(l.id, { remarks: e.target.value })} className={inp + ' w-56'} /></td>
                  </tr>
                  {open === l.id && <tr className="bg-ivory"><td colSpan={8} className="px-6 py-4"><p className="font-serif text-xl font-semibold">{l.subject}</p><p className="whitespace-pre-wrap mt-2 max-w-3xl text-ink/80">{l.enquiry}</p></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-end gap-2 text-sm pb-6">
          <button disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })} className={inp + ' disabled:opacity-40'}>Previous</button>
          <span>Page {f.page} of {pages}</span>
          <button disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })} className={inp + ' disabled:opacity-40'}>Next</button>
        </footer>
      </main>
    </div>
  );
}
