'use client';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useInspectionsQuery, useInspectMutation, problemText } from '@/store/api';
import { say } from '@/store/toastSlice';
import { MENU_GROUPS, menuGroupOf, inspectionVerdict } from '@/server/catalog';
import { Head, Loader, Problem, istDay, Busy, Confirm } from '@/components/kit';

const tone = (v) => (v <= 2 ? 'low' : v === 3 ? 'mid' : 'high');

export default function Inspect() {
  const [mess, setMess] = useState('CPN-B');
  const { data, isLoading, error } = useInspectionsQuery(mess);
  const [save, { isLoading: saving, error: saveError }] = useInspectMutation();
  const [marks, setMarks] = useState({});
  const [remark, setRemark] = useState('');
  const [raise, setRaise] = useState(false);
  const [ask, setAsk] = useState(false);
  const dispatch = useDispatch();
  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  const scored = data.items.filter((it) => marks[it.id]).length;
  const total = data.items.reduce((s, it) => s + (marks[it.id] ?? 0), 0);
  const done = scored === data.items.length;
  const lows = data.items.filter((it) => marks[it.id] && marks[it.id] <= 2);
  const verdict = done ? inspectionVerdict(total) : null;

  const pickMess = (id) => { setMess(id); setMarks({}); setRemark(''); setRaise(false); };
  const submit = async () => {
    const res = await save({ mess, marks, remark, raiseTicket: raise && lows.length > 0 });
    setAsk(false);
    if (res.data) {
      dispatch(say(`Saved: ${res.data.total}/30, ${res.data.verdict}.${res.data.ticketId ? ` Ticket #${res.data.ticketId} sent to the contractor.` : ''}`));
      setMarks({}); setRemark(''); setRaise(false);
    }
  };

  return (
    <div className="inspect-page">
      <Head title="Inspection" lead="Walk the kitchen and score each item from 1 (bad) to 5 (spotless)." />
      <div className="segs" style={{ marginBottom: 16 }}>{MENU_GROUPS.map((g) => <button key={g.id} className={`seg ${menuGroupOf(mess).id === g.id ? 'on' : ''}`} onClick={() => pickMess(g.mess)}>{g.label}</button>)}</div>

      <div className="split">
        <section className="main-col card stack" style={{ gap: 0, padding: 0 }}>
          {data.items.map((it) => (
            <div key={it.id} className="check-row">
              <div><b>{it.name}</b><div className="tiny muted">{it.hint}</div></div>
              <div className="scores" role="radiogroup" aria-label={it.name}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} role="radio" aria-checked={marks[it.id] === v} className={`score ${marks[it.id] === v ? `on ${tone(v)}` : ''}`} onClick={() => setMarks((m) => { const next = { ...m }; if (next[it.id] === v) delete next[it.id]; else next[it.id] = v; return next; })}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="stack" style={{ padding: 16, gap: 12 }}>
            <label className="field">Note (optional)<textarea className="textarea" style={{ minHeight: 70 }} value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={400} placeholder="Drain near the dishwash area is blocked." /></label>
            {lows.length > 0 && (
              <label className="tick"><input type="checkbox" checked={raise} onChange={(e) => setRaise(e.target.checked)} /> Send the {lows.length} low item{lows.length > 1 ? 's' : ''} ({lows.map((l) => l.name).join(', ')}) to the contractor as an escalated ticket</label>
            )}
            {saveError && <Problem>{problemText(saveError)}</Problem>}
          </div>
        </section>

        <aside className="side-col stack" style={{ gap: 16 }}>
          <section className="card stack" style={{ gap: 10 }}>
            <h2 className="card-title">Last {data.history.length} inspections</h2>
            <div className="history">
              {data.history.map((h) => (
                <div key={h.id} title={`${istDay(h.at)}: ${h.total}/30`}>
                  <span className={`bar-col ${h.verdict.toLowerCase()}`} style={{ height: `${(h.total / 30) * 100}%` }} />
                  <span className="tiny">{h.total}</span>
                </div>
              ))}
            </div>
            <div className="row between tiny muted"><span>{data.history[0] && istDay(data.history[0].at)}</span><span>{data.history.at(-1) && istDay(data.history.at(-1).at)}</span></div>
            <p className="tiny muted">Lime = good (24+), white = OK (18–23), orange = poor (under 18).</p>
          </section>
        </aside>
      </div>

      <div className="inspect-total">
        <div>
          <div className="tiny">{done ? 'Total' : `${scored} of ${data.items.length} scored`}</div>
          <b className="display" style={{ fontSize: 26 }}>{total}<span style={{ fontSize: 15 }}>/30</span></b>
          {verdict && <span className={`sticker s-${verdict.toLowerCase()}`} style={{ marginLeft: 8 }}>{verdict}</span>}
        </div>
        <button className="btn go" disabled={!done || saving} onClick={() => setAsk(true)}><Busy on={saving} verb="Saving">Save inspection</Busy></button>
        {ask && (
          <Confirm title={`Save the ${menuGroupOf(mess).label} inspection?`} yes="Save inspection" verb="Saving" busy={saving} onClose={() => setAsk(false)} onYes={submit}>
            Scored {total}/30 ({verdict}). {raise && lows.length > 0 ? 'The low items will be sent to the contractor as a ticket.' : 'It is added to the mess record.'}
          </Confirm>
        )}
      </div>
    </div>
  );
}
