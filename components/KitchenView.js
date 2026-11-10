'use client';
import { useState } from 'react';
import { MEAL_SLOTS } from '@/server/catalog';
import { Art, DietMark, prettyDay } from './kit';

/** Cook-for counts for today or tomorrow: one card per meal, veg / non-veg split for coupon messes. */
export default function KitchenView({ data }) {
  const [which, setWhich] = useState(0);
  const day = data.days[which];
  const max = Math.max(1, ...day.meals.map((m) => m.expected));
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="segs">
        {data.days.map((d, i) => <button key={d.day} className={`seg ${which === i ? 'on' : ''}`} onClick={() => setWhich(i)}>{d.label} · {prettyDay(d.day, { day: 'numeric', month: 'short' })}</button>)}
      </div>
      <div className="tiles">
        {day.meals.map((m) => {
          const slot = MEAL_SLOTS.find((s) => s.id === m.meal);
          return (
            <section key={m.meal} className="card lift stack" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 12 }}>
                <Art name={`meal-${m.meal}`} size={44} />
                <div style={{ flex: 1 }}>
                  <b className="sub" style={{ fontSize: 16 }}>{slot.name}</b>
                  <div className="tiny muted">{slot.opens}–{slot.closes}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tiny muted">Cook for</div>
                  <div className="stat" style={{ fontSize: 32 }}>{m.expected}</div>
                </div>
              </div>
              {m.veg != null ? (
                <div className="stack" style={{ gap: 6 }}>
                  <div className="row between small"><span className="row" style={{ gap: 6 }}><DietMark diet="veg" /> Veg</span><b>{m.veg ?? 0}</b></div>
                  <div className="split-bar" aria-hidden="true">
                    <span className="v" style={{ width: `${((m.veg ?? 0) / max) * 100}%` }} />
                    <span className="n" style={{ width: `${((m.nonveg ?? 0) / max) * 100}%` }} />
                  </div>
                  <div className="row between small"><span className="row" style={{ gap: 6 }}><DietMark diet="nonveg" /> Non-veg</span><b>{m.nonveg ?? 0}</b></div>
                </div>
              ) : (
                <p className="tiny muted">Fixed plan: every student allotted here. Veg or non-veg is chosen at the counter.</p>
              )}
              {which === 0 && (
                <div className="stack" style={{ gap: 4 }}>
                  <div className="row between small"><span>Served so far</span><b>{m.came} / {m.expected}</b></div>
                  <div className="bar"><span style={{ width: `${m.expected ? Math.min(100, (m.came / m.expected) * 100) : 0}%` }} /></div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
