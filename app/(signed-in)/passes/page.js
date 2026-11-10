'use client';
import CouponOnly from '@/components/CouponOnly';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { useSaleQuery } from '@/store/api';
import { setWeek, focus, toggle, setDiet, fill, allDiet, empty, selectPicked, selectPicks, selectFocusDay } from '@/store/basketSlice';
import { MEAL_SLOTS, WEEKDAYS, WEEKDAYS_SHORT } from '@/server/catalog';
import Dishes from '@/components/Dishes';
import { cartTotal, nudge, pickKey } from '@/server/passRules';
import { Loader, Problem, Art, Scribble, DietMark, prettyDay } from '@/components/kit';
import SaleBanner from '@/components/SaleBanner';
import Receipt from '@/components/Receipt';
import CouponTabs from '@/components/CouponTabs';

function PlannerScreen() {
  const { data: sale, isLoading, error } = useSaleQuery(undefined, { pollingInterval: 60_000 });
  const picked = useSelector(selectPicked);
  const picks = useSelector(selectPicks);
  const day = useSelector(selectFocusDay);
  const dispatch = useDispatch();
  const router = useRouter();
  // On phones the bottom basket bar hides as soon as the real receipt (with its own Review button) is on screen.
  const [receiptEl, setReceiptEl] = useState(null);
  const [receiptSeen, setReceiptSeen] = useState(false);
  useEffect(() => {
    if (!receiptEl || typeof IntersectionObserver === 'undefined') return;
    const watch = new IntersectionObserver(([e]) => setReceiptSeen(e.isIntersecting));
    watch.observe(receiptEl);
    return () => watch.disconnect();
  }, [receiptEl]);

  useEffect(() => {
    if (sale) dispatch(setWeek(sale.forWeek));
  }, [sale, dispatch]);

  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  if (sale.bought) {
    return (
      <div className="stack" style={{ gap: 24 }}>
        <CouponTabs />
        <header className="head"><div><h1 className="slant">WEEK <span className="hl">BOOKED.</span></h1><Scribble /><p>You bought {sale.bought.picks.length} coupons for the week of {prettyDay(sale.forWeek, { day: 'numeric', month: 'short' })}.</p></div></header>
        <div className="card lift tone-lime row wrap" style={{ gap: 18 }}>
          <Art name="meal-lunch" size={72} />
          <div style={{ flex: 1 }}>
            <b className="display" style={{ fontSize: 26 }}>₹{sale.bought.amount} paid</b>
            <div className="small">Receipt {sale.bought.receipt}. One purchase per week, so this week is done.</div>
          </div>
          <Link href="/passes/wallet" className="btn go">See my coupons</Link>
        </div>
      </div>
    );
  }

  const total = cartTotal(picks, sale.prices);
  const date = sale.days[day];
  const shut = sale.status === 'shut';
  const hint = nudge(total, sale);
  const ok = total >= sale.floor && total <= sale.ceiling;
  const nonvegKeys = sale.days.flatMap((d) => MEAL_SLOTS.filter((m) => sale.menu[d]?.[m.id]?.nonveg).map((m) => pickKey(d, m.id)));
  const preset = (name) => dispatch(fill({ preset: name, days: sale.days, blocked: sale.blocked, previous: sale.previous, nonvegKeys }));

  // Which shortcut matches what is picked right now (so only that button is green).
  const presetKeys = (name) => {
    const open = (list) => list.filter((k) => !sale.blocked.includes(k));
    const all = (days, meals) => open(days.flatMap((d) => meals.map((m) => pickKey(d, m))));
    if (name === 'all') return all(sale.days, ['breakfast', 'lunch', 'dinner']);
    if (name === 'lunchDinner') return all(sale.days, ['lunch', 'dinner']);
    if (name === 'weekdays') return all(sale.days.slice(0, 5), ['breakfast', 'lunch', 'dinner']);
    return open(sale.previous.map((p) => pickKey(p.day, p.meal)));
  };
  const pickedKeys = Object.keys(picked);
  const isOn = (name) => {
    const want = presetKeys(name);
    if (!want.length || want.length !== pickedKeys.length || !want.every((k) => picked[k])) return false;
    return name !== 'lastWeek' || sale.previous.every((p) => !want.includes(pickKey(p.day, p.meal)) || picked[pickKey(p.day, p.meal)] === p.diet);
  };
  const allVegOn = pickedKeys.length > 0 && pickedKeys.every((k) => picked[k] === 'veg');
  const allNonvegOn = pickedKeys.length > 0 && pickedKeys.some((k) => nonvegKeys.includes(k)) && pickedKeys.every((k) => picked[k] === (nonvegKeys.includes(k) ? 'nonveg' : 'veg'));

  return (
    <div className="stack" style={{ gap: 22 }}>
      <CouponTabs />
      <header className="head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="slant">PLAN YOUR <span className="hl">WEEK.</span></h1>
          <Scribble />
          <p>Pick a day, tap the meals you&apos;ll eat. The week needs at least ₹{sale.floor}.</p>
        </div>
        <div className="checker hide-phone" aria-hidden="true" style={{ width: 84, height: 84, backgroundSize: '21px 21px', backgroundColor: 'var(--paper)' }} />
      </header>

      <SaleBanner sale={sale} />

      <div className="split">
        <div className="main-col stack" style={{ gap: 18 }}>
          <div role="tablist" aria-label="Days" className="days">
            {sale.days.map((d, i) => {
              const count = MEAL_SLOTS.filter((m) => picked[pickKey(d, m.id)]).length;
              return (
                <button key={d} role="tab" aria-selected={i === day} className={`day ${i === day ? 'on' : ''}`} onClick={() => dispatch(focus(i))}>
                  <span className="eyebrow" style={{ fontSize: 11 }}>{WEEKDAYS_SHORT[i]}</span>
                  <span className="display" style={{ fontSize: 26 }}>{Number(d.slice(8))}</span>
                  <span className="pips" aria-label={`${count} meals picked`}>
                    {MEAL_SLOTS.map((m) => <i key={m.id} className={picked[pickKey(d, m.id)] ?? ''} title={`${m.name}: ${picked[pickKey(d, m.id)] === 'nonveg' ? 'non-veg' : picked[pickKey(d, m.id)] ? 'veg' : 'not taken'}`} />)}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="card lift flush">
            <div className="card-bar tone-ink"><h2>{WEEKDAYS[day]}, {prettyDay(date, { day: 'numeric', month: 'short' })}</h2></div>
            <div className="stack" style={{ padding: 18, gap: 12 }}>
              {MEAL_SLOTS.map((m) => {
                const key = pickKey(date, m.id);
                const diet = picked[key];
                const dish = sale.menu[date]?.[m.id];
                const on = Boolean(diet);
                const blocked = sale.blocked.includes(key);
                return (
                  <div key={m.id} className={`meal-row ${on ? 'on' : ''} ${blocked ? 'blocked' : ''}`}>
                    <button className="meal-hit" aria-pressed={on} disabled={blocked} onClick={() => dispatch(toggle({ day: date, meal: m.id }))}>
                      <Art name={`meal-${m.id}`} size={60} />
                      <span style={{ flex: 1 }}>
                        <span className="display" style={{ fontSize: 20, display: 'block' }}>{m.name}</span>
                        <span className="small">{m.opens} – {m.closes} · ₹{sale.prices[m.id]}</span>
                        <Dishes dish={dish} chosen={diet} />
                      </span>
                      {!on && <span className="sticker">{blocked ? 'Started' : '+ Add'}</span>}
                    </button>
                    {on && (
                      <div className="diet-switch" role="radiogroup" aria-label={`${m.name}: veg or non-veg`}>
                        {dish?.nonveg ? ['veg', 'nonveg'].map((d) => (
                          <button key={d} role="radio" aria-checked={diet === d} className={`diet ${d} ${diet === d ? 'on' : ''}`} onClick={() => dispatch(setDiet({ day: date, meal: m.id, diet: d }))}>
                            <DietMark diet={d} size={15} /> {d === 'veg' ? 'Veg' : 'Non-veg'}
                          </button>
                        )) : (
                          <span className="diet veg on" style={{ cursor: 'default' }}><DietMark diet="veg" size={15} /> Veg only</span>
                        )}
                        <button className="diet" aria-label={`Remove ${m.name}`} title="Remove" onClick={() => dispatch(toggle({ day: date, meal: m.id }))}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="row wrap">
            <button className={`btn ${isOn('all') ? 'lime' : ''}`} aria-pressed={isOn('all')} onClick={() => preset('all')}>Full week</button>
            <button className={`btn ${isOn('lunchDinner') ? 'lime' : ''}`} aria-pressed={isOn('lunchDinner')} onClick={() => preset('lunchDinner')}>Lunch + dinner all week</button>
            <button className={`btn ${isOn('weekdays') ? 'lime' : ''}`} aria-pressed={isOn('weekdays')} onClick={() => preset('weekdays')}>Weekdays only</button>
            {sale.previous.length > 0 && <button className={`btn ${isOn('lastWeek') ? 'lime' : ''}`} aria-pressed={isOn('lastWeek')} onClick={() => preset('lastWeek')}>Copy last week</button>}
            <button className={`btn ${allVegOn ? 'lime' : ''}`} aria-pressed={allVegOn} disabled={picks.length === 0} title={picks.length ? undefined : 'Pick a meal first'} onClick={() => dispatch(allDiet({ diet: 'veg', nonvegKeys }))}><DietMark diet="veg" /> All veg</button>
            <button className={`btn ${allNonvegOn ? 'lime' : ''}`} aria-pressed={allNonvegOn} disabled={picks.length === 0} title={picks.length ? 'Where the menu has a non-veg dish' : 'Pick a meal first'} onClick={() => dispatch(allDiet({ diet: 'nonveg', nonvegKeys }))}><DietMark diet="nonveg" /> Non-veg where possible</button>
            <button className="btn plain" onClick={() => dispatch(empty())}>Clear all</button>
          </div>
        </div>

        <div className={`basket-bar ${receiptSeen ? 'away' : ''}`} aria-hidden={receiptSeen} role="region" aria-label="Your basket">
          <div>
            <b className="display" style={{ fontSize: 22 }}>₹{total}</b>
            <span className="tiny"> · {picks.length} meals</span>
            <div className="tiny">{shut ? 'Sales open Saturday' : hint ?? 'Minimum reached'}</div>
          </div>
          <button className={`btn ${ok && !shut ? 'go' : ''}`} disabled={!ok || shut} onClick={() => router.push('/passes/review')}>Review →</button>
        </div>

        <aside className="side-col" ref={setReceiptEl}>
          <Receipt picks={picks} prices={sale.prices} total={total} floor={sale.floor} ceiling={sale.ceiling} hint={hint}>
            <button className="btn go lg block" disabled={!ok || shut} onClick={() => router.push('/passes/review')}>
              {shut ? 'Sales open Saturday' : 'Review and pay →'}
            </button>
            <p className="tiny muted">Book until Monday, before dinner. Unused coupons aren&apos;t refunded.</p>
          </Receipt>
        </aside>
      </div>
    </div>
  );
}

export default function Planner() {
  return <CouponOnly><PlannerScreen /></CouponOnly>;
}
