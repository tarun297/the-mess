'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { useTodayQuery, useRateMealMutation, useSkipMealMutation, problemText } from '@/store/api';
import { say } from '@/store/toastSlice';
import { Loader, Problem, Art, Icon, Countdown, DietMark, prettyDay, Busy, Confirm } from '@/components/kit';
import Dishes from '@/components/Dishes';
import CheckInPanel from '@/components/CheckInPanel';

const hello = (ms) => {
  const h = new Date(ms + 19_800_000).getUTCHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const firstName = (s) => s.split(' ')[0];

function RateCard({ meal }) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [rate, { isLoading, error }] = useRateMealMutation();
  const dispatch = useDispatch();
  const flip = (t) => setTags((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));
  const send = async () => {
    const res = await rate({ meal: meal.id, stars, remark: tags.join(', ') || undefined });
    if (res.data) dispatch(say(`Thanks! ${meal.name} rated ${stars} star${stars > 1 ? 's' : ''}.`));
  };
  return (
    <section className="card lift tone-violet stack" style={{ position: 'relative', gap: 14 }}>
      <div className="checker" aria-hidden="true" style={{ position: 'absolute', right: -12, top: -14, width: 48, height: 48, backgroundColor: 'var(--paper)', backgroundSize: '16px 16px' }} />
      <h2 className="card-title">Rate today&apos;s {meal.name.toLowerCase()}</h2>
      <div className="card stack" style={{ background: 'var(--paper)', color: 'var(--ink)', gap: 12, padding: 16 }}>
        <div className="row" role="radiogroup" aria-label={`Stars for ${meal.name}`} style={{ gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)}
              style={{ width: 44, height: 44, border: 0, background: 'none', padding: 0, cursor: 'pointer' }}>
              <Icon name="star" size={34} width={1.8} stroke="#121212" fill={n <= stars ? '#D5E07C' : '#FFFBF3'} />
            </button>
          ))}
        </div>
        {stars > 0 && (
          <div className="chips" aria-label="Quick comments">
            {(stars >= 4 ? ['Loved it', 'Good portion', 'Hot and fresh', 'More of this'] : ['Too salty', 'Too oily', 'Cold', 'Small portion', 'Undercooked', 'Bland']).map((t) => (
              <button key={t} type="button" className={`chip ${tags.includes(t) ? 'on' : ''}`} aria-pressed={tags.includes(t)} onClick={() => flip(t)} style={{ minHeight: 38, fontSize: 13, padding: '0 12px' }}>{t}</button>
            ))}
          </div>
        )}
        {error && <Problem>{problemText(error)}</Problem>}
        <button className="btn go" onClick={send} disabled={!stars || isLoading} style={{ alignSelf: 'flex-end' }}><Busy on={isLoading} verb="Sending">Send <Icon name="arrow" size={17} /></Busy></button>
      </div>
    </section>
  );
}

function AllRated({ meals }) {
  return (
    <section className={`card lift stack ${meals.some((m) => m.stars) ? '' : 'hide-phone'}`} style={{ gap: 12 }}>
      <h2 className="card-title">Your ratings today</h2>
      {meals.filter((m) => m.stars).length === 0 ? (
        <p className="small muted">Eat a meal and check in, then rate it here. Ratings go straight to the mess team.</p>
      ) : (
        meals.filter((m) => m.stars).map((m) => (
          <div key={m.id} className="row between">
            <b className="sub">{m.name}</b>
            <span className="row" style={{ gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={18} width={1.8} stroke="#121212" fill={n <= m.stars ? '#D5E07C' : 'none'} />)}
            </span>
          </div>
        ))
      )}
    </section>
  );
}

function SkipButton({ day, meal }) {
  const [skip, { isLoading }] = useSkipMealMutation();
  const [ask, setAsk] = useState(false);
  const dispatch = useDispatch();
  const toggle = async () => {
    const res = await skip({ day, meal: meal.id, skip: !meal.skipped });
    if (res.data) dispatch(say(meal.skipped ? `Back in for ${meal.name.toLowerCase()}.` : `Skipping ${meal.name.toLowerCase()}. The kitchen will cook one less.`));
  };
  return (
    <>
      <button className={`btn sm ${meal.skipped ? 'orange' : ''}`} onClick={meal.skipped ? toggle : () => setAsk(true)} disabled={isLoading} style={{ marginTop: 8 }}>
        <Busy on={isLoading} verb="Saving">{meal.skipped ? 'Skipping · undo' : "I'll skip this"}</Busy>
      </button>
      {ask && (
        <Confirm title={`Skip ${meal.name.toLowerCase()}?`} yes="Skip it" verb="Saving" busy={isLoading} onClose={() => setAsk(false)} onYes={async () => { await toggle(); setAsk(false); }}>
          The kitchen will cook one less. You can undo this until the meal starts.
        </Confirm>
      )}
    </>
  );
}

export default function StudentHome() {
  const { data, isLoading, error } = useTodayQuery(undefined, { pollingInterval: 60_000 });
  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  const focus = data.serving ?? data.next;
  const tomorrow = !data.serving && data.next.day !== data.day;
  const dish = tomorrow ? null : data.menu[focus.id];
  const focusDiet = tomorrow ? null : data.meals.find((m) => m.id === focus.id)?.diet;
  const focusPass = data.passes && !tomorrow ? data.meals.find((m) => m.id === focus.id)?.pass : null;
  const ateFocus = !tomorrow && data.meals.find((m) => m.id === focus.id)?.ate;
  const p = data.passes;

  let tag = null;
  if (ateFocus) tag = <span className="sticker tilt" style={{ background: 'var(--lime)' }}>Checked in</span>;
  else if (data.plan === 'fixed') tag = <span className="sticker tilt">Fixed plan</span>;
  else if (focusPass === 'ready') tag = <span className="sticker tilt">Coupon ready</span>;
  else if (p && !tomorrow) tag = <span className="sticker tilt">No coupon</span>;

  return (
    <div className="stack" style={{ gap: 26 }}>
      <header className="head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="display">{hello(data.now)}!</h1>
          <p>Here&apos;s what&apos;s on the table at <b>{data.messTitle}</b><span className="show-phone"> · {prettyDay(data.day, { weekday: 'short', day: 'numeric', month: 'short' })}</span>.</p>
        </div>
        <span className="sticker hide-phone" style={{ fontSize: 13, padding: '8px 12px' }}>{prettyDay(data.day, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </header>

      {p && p.sale.status !== 'shut' && !p.boughtForSaleWeek && (
        <Link href="/passes" className="nudge">
          <Icon name="clock" size={20} />
          <span><b>{p.sale.status === 'late' ? 'Last chance today: ' : ''}Coupon sales close in <Countdown to={p.sale.endsAt} serverNow={data.now} /></b><span className="small"> · You haven&apos;t planned next week yet.</span></span>
          <span className="bold nowrap">Plan now →</span>
        </Link>
      )}

      <div className="split">
        <section id="checkin" className="card lift flush main-col">
          <div className="card-bar tone-orange">
            <h2>{data.serving ? `Now serving: ${focus.name}` : `${tomorrow ? 'Tomorrow' : 'Next'}: ${focus.name}`}</h2>
            {tag}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div className="stack" style={{ flex: '1 1 250px', padding: 20, gap: 12 }}>
              <div className="row between" style={{ gap: 10, alignItems: 'baseline' }}>
                <b className="sub" style={{ fontSize: 20 }}>{focus.opens} – {focus.closes}</b>
                {!data.serving && <span className="small nowrap" style={{ opacity: 0.55 }}>Starts in <b><Countdown to={data.next.at} serverNow={data.now} /></b></span>}
              </div>
              {dish ? <Dishes dish={dish} chosen={focusDiet} /> : <p className="muted">Tomorrow&apos;s menu is on the Menu page.</p>}
              {!ateFocus && <CheckInPanel meal={data.serving} next={data.next} />}
              <div className="row wrap" style={{ marginTop: 4 }}>
                <Link href="/menu" className="btn sm plain">Full week&apos;s menu</Link>
              </div>
            </div>
            <div className="hero-art" style={{ flex: '1 1 260px', minHeight: 220, borderLeft: 'var(--edge)', background: 'var(--orange)', overflow: 'hidden', position: 'relative' }}>
              <img src="/art/thali-scene.svg" alt="A steel thali with dal, sabzi, rice, roti and raita" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </section>
        <div className="side-col">
          {data.toRate ? <RateCard key={data.toRate.id} meal={data.toRate} /> : <AllRated meals={data.meals} />}
        </div>
      </div>

      <div className="tiles quick">
        {p ? (
          <Link href="/passes/wallet" className="card lift tone-lime stack" style={{ gap: 6 }}>
            <div className="num" style={{ fontSize: 46 }}>{p.week.total - p.week.used}<span style={{ fontSize: 20 }}> / {p.week.total}</span></div>
            <b className="sub" style={{ fontSize: 18 }}>Coupons left this week</b>
            <span className="small">See my coupons →</span>
          </Link>
        ) : (
          <Link href="/menu" className="card lift tone-lime stack" style={{ gap: 6 }}>
            <Icon name="menu" size={32} />
            <b className="sub" style={{ fontSize: 18 }}>This week&apos;s menu</b>
            <span className="small">Every meal, every day →</span>
          </Link>
        )}
        {p ? (
          <Link href="/passes" className="card lift stack" style={{ gap: 6 }}>
            <Icon name="plan" size={32} />
            <b className="sub" style={{ fontSize: 18 }}>
              {p.sale.status === 'shut' ? 'Plan next week' : p.boughtForSaleWeek ? 'Next week is booked' : 'Coupon sales are open'}
            </b>
            <span className="small">
              {p.sale.status === 'shut' && <>Sales open in <Countdown to={p.sale.startsAt} serverNow={data.now} /> →</>}
              {p.sale.status !== 'shut' && (p.boughtForSaleWeek ? `Paid ₹${p.boughtForSaleWeek} →` : <>Closes in <Countdown to={p.sale.endsAt} serverNow={data.now} /> →</>)}
            </span>
          </Link>
        ) : (
          <a href="#checkin" className="card lift stack" style={{ gap: 6 }}>
            <Icon name="scan" size={32} />
            <b className="sub" style={{ fontSize: 18 }}>Check in</b>
            <span className="small">Scan the code at the entrance →</span>
          </a>
        )}
        <Link href="/feedback" className="card lift tone-orange stack" style={{ gap: 6 }}>
          <Icon name="talk" size={32} />
          <b className="sub" style={{ fontSize: 18 }}>Mess feedback</b>
          <span className="small">Tell the mess what to fix →</span>
        </Link>
      </div>

      <section className="stack" style={{ gap: 14 }}>
        <h2 className="display" style={{ fontSize: 26 }}>Today&apos;s meals</h2>
        <div className="tiles meals">
          {data.meals.map((m) => {
            let state = 'Coming up';
            let tone = '';
            if (m.ate) [state, tone] = ['Eaten', 'tone-lime'];
            else if (m.skipped) [state, tone] = ['Skipping', 'tone-peach'];
            else if (data.passes && m.pass === 'none') state = m.over ? 'No coupon' : 'No coupon booked';
            else if (m.over) state = 'Missed';
            else if (data.serving?.id === m.id) [state, tone] = ['Serving now', 'tone-peach'];
            return (
              <div key={m.id} className={`card stack ${tone}`} style={{ gap: 8, flexDirection: 'row', alignItems: 'center', opacity: !m.ate && m.over ? 0.65 : 1 }}>
                <Art name={`meal-${m.id}`} size={64} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="eyebrow">{state}</div>
                  <b className="display row" style={{ fontSize: 20, gap: 8 }}>{m.name} {m.diet && <DietMark diet={m.diet} />}</b>
                  <div className="small">{m.opens} – {m.closes}</div>
                  <Dishes dish={data.menu[m.id]} compact />
                  {data.plan === 'fixed' && !m.ate && !m.started && <SkipButton day={data.day} meal={m} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
