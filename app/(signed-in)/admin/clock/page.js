'use client';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useClockQuery, useSetClockMutation, problemText } from '@/store/api';
import { say } from '@/store/toastSlice';
import { WEEKDAYS } from '@/server/catalog';
import { Head, Loader, Problem, Icon, useServerClock, Busy, Confirm } from '@/components/kit';

const JUMPS = [
  ['saturday', 'plan', 'Saturday 11:00 AM', 'Coupon sales are open for next week.'],
  ['grace', 'clock', 'Next Monday 10:00 AM', 'Grace period: breakfast is locked, the rest can still be bought.'],
  ['closed', 'close', 'Wednesday 4:00 PM', 'Sales closed: the planner can plan but not buy.'],
  ['breakfast', 'scan', 'Today 7:45 AM', 'Breakfast is on: try check-in.'],
  ['lunch', 'scan', 'Today 12:30 PM', 'Lunch is on.'],
  ['dinner', 'scan', 'Today 7:30 PM', 'Dinner is on.'],
];
const SALE = { open: 'Sales open', late: 'Grace period', shut: 'Sales closed' };

export default function DemoClock() {
  const { data, isLoading, error } = useClockQuery();
  const [setClock, { isLoading: saving, error: saveError }] = useSetClockMutation();
  const [custom, setCustom] = useState({ day: '', clock: '12:30' });
  const [pending, setPending] = useState(null); // { body, msg } waiting for "Yes"
  const dispatch = useDispatch();
  const now = useServerClock(data?.now);
  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  const ask = (body, msg) => setPending({ body, msg });
  const apply = async (body, msg) => {
    const res = await setClock(body);
    if (res.data) dispatch(say(msg ?? `App time is now ${WEEKDAYS[res.data.weekday]} ${res.data.clock}.`));
  };
  const t = new Date(now).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' });

  return (
    <>
      {pending && (
        <Confirm title="Move the demo clock?" yes="Move it" verb="Saving" busy={saving} onClose={() => setPending(null)} onYes={async () => { await apply(pending.body, pending.msg); setPending(null); }}>
          Every time-based rule (meal hours, coupon sales, check-in) changes for everyone using the app.
        </Confirm>
      )}
      <Head title="Demo clock" lead="Move the app's clock to show every time-based rule in a live demo. Only the admin sees this." />
      <section className="card lift stack" style={{ marginBottom: 18 }}>
        <div className="stat-label">App time (IST)</div>
        <div className="stat" style={{ fontSize: 26 }}>{t}</div>
        <div className="row wrap">
          <span className={`sticker ${data.shifted ? 's-poor' : 's-good'}`}>{data.shifted ? 'Pretend time' : 'Real time'}</span>
          <span className="sticker">{SALE[data.sale]}</span>
        </div>
        <button className="btn" disabled={!data.shifted || saving} onClick={() => ask({ jump: 'real' }, 'Back to real time.')}>Back to real time</button>
      </section>

      <h2 className="card-title" style={{ marginBottom: 12 }}>Jump to</h2>
      <div className="tiles" style={{ marginBottom: 18 }}>
        {JUMPS.map(([id, icon, title, text]) => (
          <button key={id} className="card jump" disabled={saving} onClick={() => ask({ jump: id })}>
            <Icon name={icon} size={20} />
            <span><b>{title}</b><span className="small muted" style={{ display: 'block' }}>{text}</span></span>
          </button>
        ))}
      </div>

      <div className="tiles">
        <section className="card stack">
          <h2 className="card-title">Pick a time</h2>
          <div className="row wrap">
            <input type="date" className="input" style={{ flex: '1 1 160px' }} value={custom.day} onChange={(e) => setCustom({ ...custom, day: e.target.value })} aria-label="Date" />
            <input type="time" className="input" style={{ flex: '1 1 120px' }} value={custom.clock} onChange={(e) => setCustom({ ...custom, clock: e.target.value })} aria-label="Time" />
          </div>
          <button className="btn go" disabled={!custom.day || saving} onClick={() => ask(custom)}><Busy on={saving} verb="Saving">Set time</Busy></button>
        </section>
        <section className="card stack">
          <h2 className="card-title">Check-in outside meal hours</h2>
          <label className="tick">
            <input type="checkbox" checked={data.anyHourEntry} onChange={(e) => apply({ anyHourEntry: e.target.checked }, e.target.checked ? 'Check-in allowed at any hour.' : 'Check-in only during meal hours.')} />
            <span>Allow it, counting toward the nearest meal. Keep this on so a live demo always works.</span>
          </label>
        </section>
        <section className="card stack">
          <h2 className="card-title">Simulated QR scan</h2>
          <label className="tick">
            <input type="checkbox" checked={data.demoScan} onChange={(e) => apply({ demoScan: e.target.checked }, e.target.checked ? 'Tap to scan now pretends to scan after 2 seconds.' : 'Tap to scan now needs a real QR.')} />
            <span>On a phone, "Tap to scan" opens the camera and pretends it read the entrance QR after 2 seconds, so a demo works without a second screen. Switch it off to need the real QR.</span>
          </label>
        </section>
      </div>
      {saveError && <div style={{ marginTop: 12 }}><Problem>{problemText(saveError)}</Problem></div>}
    </>
  );
}
