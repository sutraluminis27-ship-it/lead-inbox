'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';

const API = '';
const STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'CLOSED'] as const;
const LABEL: Record<string, string> = { NEW: 'New', CONTACTED: 'Contacted', FOLLOW_UP: 'Follow-up', CLOSED: 'Closed' };
const TONE: Record<string, string> = { NEW: 'bg-teal-100 text-teal-900', CONTACTED: 'bg-sky-100 text-sky-900', FOLLOW_UP: 'bg-amber-100 text-amber-900', CLOSED: 'bg-stone-200 text-stone-700' };

type Lead = { id: number; receivedAt: string; account: { email: string }; name: string; phone: string | null; email: string; subject: string; enquiry: string; status: string; assignedTo: string | null; remarks: string | null };
type Account = { id: string; email: string; lastSyncAt: string | null; _count: { leads: number } };

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` } });
  if (r.status === 401) { localStorage.removeItem('token'); location.reload(); }
  return r.json();
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  const go = async () => {
    const r = await fetch(API + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const d = await r.json();
    if (d.token) { localStorage.setItem('token', d.token); onDone(); } else setErr(d.error);
  };
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm bg-white border border-line rounded-lg p-6 space-y-3">
        <h1 className="text-xl font-semibold">Lead Inbox</h1>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="Password" className="w-full border border-line rounded px-3 py-2" />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button onClick={go} className="w-full bg-accent text-white rounded py-2 font-medium">Sign in</button>
      </div>
    </main>
  );
}

export default function Page() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [f, setF] = useState({ status: '', accountId: '', q: '', page: 1 });
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ ...f, page: String(f.page) } as any);
    const [l, a] = await Promise.all([api('/api/leads?' + qs), api('/api/accounts')]);
    setLeads(l.items || []); setCounts(l.counts || {}); setPages(l.pages || 1); setAccounts(Array.isArray(a) ? a : []);
  }, [f]);

  useEffect(() => { setAuthed(!!localStorage.getItem('token')); }, []);
  useEffect(() => { if (authed) { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); } }, [authed, load]);

  const patch = async (id: number, body: Partial<Lead>) => { await api('/api/leads/' + id, { method: 'PATCH', body: JSON.stringify(body) }); load(); };
  const connect = async () => { const { url } = await api('/api/accounts/connect-url'); location.href = url; };

  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const inp = 'border border-line rounded px-2 py-1.5 bg-white text-sm';
  return (
    <main className="max-w-[1400px] mx-auto p-4 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Lead Inbox</h1>
        <button onClick={connect} className="bg-accent text-white rounded px-3 py-2 text-sm font-medium">Connect Gmail account</button>
      </header>

      <section className="flex flex-wrap gap-2">
        {accounts.length === 0 && <p className="text-sm text-stone-600">No mailboxes connected yet. Connect your first Gmail account to start collecting leads.</p>}
        {accounts.map(a => (
          <span key={a.id} className="bg-white border border-line rounded-full pl-3 pr-1 py-1 text-xs flex items-center gap-2" title={a.lastSyncAt ? 'Last sync ' + new Date(a.lastSyncAt).toLocaleString() : 'Not synced yet'}>
            {a.email} <b>{a._count.leads}</b>
            <button onClick={() => api(`/api/accounts/${a.id}/sync`, { method: 'POST' })} className="rounded-full bg-paper px-2 py-0.5">Sync now</button>
          </span>
        ))}
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setF({ ...f, status: f.status === s ? '' : s, page: 1 })} className={`text-left bg-white border rounded-lg p-3 ${f.status === s ? 'border-accent' : 'border-line'}`}>
            <div className="text-2xl font-semibold">{counts[s] || 0}</div><div className="text-sm text-stone-600">{LABEL[s]}</div>
          </button>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        <input className={inp + ' flex-1 min-w-[200px]'} placeholder="Search name, email, phone, remarks" value={f.q} onChange={e => setF({ ...f, q: e.target.value, page: 1 })} />
        <select className={inp} value={f.accountId} onChange={e => setF({ ...f, accountId: e.target.value, page: 1 })}>
          <option value="">All mailboxes</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
        </select>
      </section>

      <div className="overflow-x-auto bg-white border border-line rounded-lg">
        <table className="w-full text-sm">
          <thead className="text-left bg-paper"><tr>{['ID', 'Received', 'Mailbox', 'Customer', 'Phone', 'Email', 'Status', 'Assigned to', 'Remarks'].map(h => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {leads.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-stone-600">No leads match. New enquiries appear here within a minute of arriving.</td></tr>}
            {leads.map(l => (
              <Fragment key={l.id}>
                <tr className="border-t border-line align-top">
                  <td className="px-3 py-2"><button onClick={() => setOpen(open === l.id ? null : l.id)} className="underline">#{l.id}</button></td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(l.receivedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{l.account.email}</td>
                  <td className="px-3 py-2 font-medium">{l.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{l.phone || '-'}</td>
                  <td className="px-3 py-2"><a className="underline" href={`mailto:${l.email}`}>{l.email}</a></td>
                  <td className="px-3 py-2"><select value={l.status} onChange={e => patch(l.id, { status: e.target.value })} className={`rounded px-2 py-1 ${TONE[l.status]}`}>{STATUSES.map(s => <option key={s} value={s}>{LABEL[s]}</option>)}</select></td>
                  <td className="px-3 py-2"><input defaultValue={l.assignedTo || ''} onBlur={e => e.target.value !== (l.assignedTo || '') && patch(l.id, { assignedTo: e.target.value })} className={inp + ' w-28'} /></td>
                  <td className="px-3 py-2"><input defaultValue={l.remarks || ''} onBlur={e => e.target.value !== (l.remarks || '') && patch(l.id, { remarks: e.target.value })} className={inp + ' w-56'} /></td>
                </tr>
                {open === l.id && <tr className="bg-paper"><td colSpan={9} className="px-3 py-3"><p className="font-medium">{l.subject}</p><p className="whitespace-pre-wrap mt-1 max-w-3xl">{l.enquiry}</p></td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-end gap-2 text-sm">
        <button disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })} className={inp}>Previous</button>
        <span>Page {f.page} of {pages}</span>
        <button disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })} className={inp}>Next</button>
      </footer>
    </main>
  );
}
