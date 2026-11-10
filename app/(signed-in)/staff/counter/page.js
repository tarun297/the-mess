'use client';
import { useState } from 'react';
import { useCounterEntryMutation, useEntryScreenQuery, problemText } from '@/store/api';
import { Head, Problem, Icon, Busy, Confirm } from '@/components/kit';
import EntryResult from '@/components/EntryResult';

// For students without a phone: staff type the roll number from the ID card.
export default function Counter() {
  const [roll, setRoll] = useState('');
  const [log, setLog] = useState([]);
  const [ask, setAsk] = useState(false);
  const [check, { isLoading, error }] = useCounterEntryMutation();
  const { data: live } = useEntryScreenQuery(undefined, { pollingInterval: 5000 });

  const send = (e) => { e.preventDefault(); setAsk(true); };
  const doCheck = async () => {
    const res = await check(roll.trim());
    setAsk(false);
    if (res.data) {
      setLog((l) => [res.data, ...l].slice(0, 8));
      setRoll('');
    }
  };

  return (
    <>
      <Head title="Counter check-in" lead="For students without a phone. Type the roll number from their ID card." />
      <div className="split">
        <form className="main-col card lift stack" onSubmit={send} style={{ maxWidth: 520 }}>
          <label className="field">
            Roll number
            <input className="input big-roll" value={roll} onChange={(e) => setRoll(e.target.value.toUpperCase())} placeholder="B522041" autoFocus autoComplete="off" />
          </label>
          {error && <Problem>{problemText(error)}</Problem>}
          <button className="btn go lg" disabled={!roll.trim() || isLoading}><Busy on={isLoading} verb="Checking in"><Icon name="check" size={18} /> Check in</Busy></button>
          {ask && (
            <Confirm title={`Check in ${roll.trim()}?`} yes="Check in" verb="Checking in" busy={isLoading} onClose={() => setAsk(false)} onYes={doCheck}>
              They&apos;ll be marked as served for the meal on now.
            </Confirm>
          )}
          {live?.counts && (
            <p className="small muted">{live.meal.name}: <b style={{ color: '#121212' }}>{live.counts.came}</b> of {live.counts.expected} served at {live.messTitle}.</p>
          )}
        </form>
        <div className="side-col stack" style={{ gap: 12 }}>
          {log.length === 0 ? (
            <div className="card small muted">Results show here. Try B522041 (coupon), B525027 (another mess) or B423070.</div>
          ) : (
            <>
              <EntryResult result={log[0]} forStaff />
              {log.slice(1).map((r, i) => (
                <div key={i} className="card tight row between small">
                  <span><b>{r.who?.name ?? 'Unknown'}</b> <span className="muted">{r.who?.roll}</span></span>
                  <span className={`sticker ${r.outcome === 'in' ? 's-good' : 's-poor'}`}>{r.headline}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
