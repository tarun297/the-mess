'use client';
// Coupon Bhandar: the student coupon swap. Money is handled outside the app; the app matches people and moves the coupon.
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  useBhandarQuery, useBhandarBrowseQuery, useBhandarSellableQuery, usePostListingsMutation, useTakeDownListingMutation,
  useAddWantMutation, useRemoveWantMutation, useRequestListingMutation, useAnswerRequestMutation, useReportRequestMutation, problemText,
} from '@/store/api';
import { say } from '@/store/toastSlice';
import { MEAL_SLOTS, mealName } from '@/server/catalog';
import { Head, Loader, Problem, Empty, Icon, Art, DietMark, Countdown, Busy, Modal, Confirm, prettyDay } from '@/components/kit';
import Dishes from '@/components/Dishes';
import CouponOnly from '@/components/CouponOnly';
import { hasStarted } from '@/server/time';

const dayText = (d) => prettyDay(d, { weekday: 'short', day: 'numeric', month: 'short' });
const PAY_NOTE = 'Payment happens outside the app. Pay when you meet, or after you see "Coupon received".';

function ReportButton({ requestId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [report, { isLoading, error }] = useReportRequestMutation();
  const dispatch = useDispatch();
  const send = async (e) => {
    e.preventDefault();
    const res = await report({ id: requestId, reason });
    if (res.data) {
      dispatch(say('Reported. The mess society can look into it.'));
      setOpen(false);
      setReason('');
    }
  };
  return (
    <>
      <button className="btn sm plain" onClick={() => setOpen(true)}>Report</button>
      {open && (
        <Modal title="Report a problem" onClose={() => setOpen(false)}>
          <form className="stack" style={{ gap: 12 }} onSubmit={send}>
            <label className="field">
              What went wrong?
              <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Asked for more than the listed price." autoFocus />
            </label>
            {error && <Problem>{problemText(error)}</Problem>}
            <button className="btn go" disabled={isLoading || reason.trim().length < 5}><Busy on={isLoading} verb="Sending">Send report</Busy></button>
          </form>
        </Modal>
      )}
    </>
  );
}

/** A seller sees these first: a buyer is waiting and the 30-minute clock is running. */
function Incoming({ listing, serverNow }) {
  const [answer, { isLoading, originalArgs, error }] = useAnswerRequestMutation();
  const [askPaid, setAskPaid] = useState(false);
  const dispatch = useDispatch();
  const act = async (action) => {
    const res = await answer({ id: listing.request_id, action });
    if (res.data) dispatch(say(action === 'paid' ? 'Handed over. The coupon is now in their wallet.' : 'Declined. Your listing is open again.'));
  };
  const busy = (a) => isLoading && originalArgs?.action === a;
  return (
    <div className="card tone-peach stack" style={{ gap: 10 }}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <b className="sub" style={{ fontSize: 17 }}>{listing.buyer_name} <span className="muted">· {listing.buyer_roll}</span></b>
        <span className="sticker">Held · <Countdown to={listing.expires_at} serverNow={serverNow} /></span>
      </div>
      <div className="row small bold" style={{ gap: 8 }}><DietMark diet={listing.diet} /> {mealName(listing.meal)} · {dayText(listing.day)} · ₹{listing.price}</div>
      <p className="small">{PAY_NOTE} Tap the button below only after you have been paid.</p>
      {error && <Problem>{problemText(error)}</Problem>}
      <div className="row wrap">
        <button className="btn go" disabled={isLoading} onClick={() => setAskPaid(true)}><Busy on={busy('paid')} verb="Handing over">Paid, hand over</Busy></button>
        <button className="btn" disabled={isLoading} onClick={() => act('decline')}><Busy on={busy('decline')} verb="Declining">Decline</Busy></button>
        <ReportButton requestId={listing.request_id} />
      </div>
      {askPaid && (
        <Confirm title="Hand the coupon over?" yes="Yes, I've been paid" verb="Handing over" busy={busy('paid')} onClose={() => setAskPaid(false)} onYes={async () => { await act('paid'); setAskPaid(false); }}>
          Only do this once {listing.buyer_name} has paid you. The coupon moves to their wallet and can&apos;t be taken back.
        </Confirm>
      )}
    </div>
  );
}

function MyListing({ l }) {
  const [takeDown, { isLoading }] = useTakeDownListingMutation();
  const dispatch = useDispatch();
  const state = { open: ['Open', 'var(--lime)'], held: ['On hold', 'var(--orange)'], sold: ['Sold', 'var(--lime)'], closed: ['Closed', 'var(--paper)'] }[l.status];
  const off = async () => {
    const res = await takeDown(l.id);
    if (res.data) dispatch(say('Listing taken down.'));
  };
  return (
    <div className="card stack" style={{ gap: 12, opacity: l.status === 'closed' ? 0.7 : 1 }}>
      <div style={{ minWidth: 0 }}>
        <b className="sub row" style={{ gap: 8 }}><DietMark diet={l.diet} /> {mealName(l.meal)} · {dayText(l.day)}</b>
        <div className="small">₹{l.price}{l.price < l.face ? ` (face ₹${l.face})` : ''}{l.status === 'closed' && l.reason ? ` · ${l.reason}` : ''}</div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <span className="sticker" style={{ background: state[1] }}>{state[0]}</span>
        {l.status === 'open' && <button className="btn sm" disabled={isLoading} onClick={off}><Busy on={isLoading} verb="Removing">Take down</Busy></button>}
      </div>
    </div>
  );
}

function MyRequest({ r, serverNow }) {
  const [answer, { isLoading }] = useAnswerRequestMutation();
  const dispatch = useDispatch();
  const cancel = async () => {
    const res = await answer({ id: r.id, action: 'cancel' });
    if (res.data) dispatch(say('Request cancelled.'));
  };
  const label = { held: 'Held for you', done: 'Coupon received', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired' }[r.status];
  return (
    <div className={`card stack ${r.status === 'held' ? 'tone-lime' : ''}`} style={{ gap: 8, opacity: r.status === 'held' || r.status === 'done' ? 1 : 0.7 }}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <b className="sub row" style={{ gap: 8 }}><DietMark diet={r.diet} /> {mealName(r.meal)} · {dayText(r.day)} · ₹{r.price}</b>
        <span className="sticker">{label}{r.status === 'held' && <> · <Countdown to={r.expires_at} serverNow={serverNow} /></>}</span>
      </div>
      {(r.status === 'held' || r.status === 'done') && <div className="small">Seller: <b>{r.seller_name}</b> · {r.seller_roll}</div>}
      {r.status === 'held' && (
        <>
          <p className="small">{PAY_NOTE} The seller hands the coupon over once they have been paid.</p>
          <div className="row wrap">
            <button className="btn sm" disabled={isLoading} onClick={cancel}><Busy on={isLoading} verb="Cancelling">Cancel request</Busy></button>
            <ReportButton requestId={r.id} />
          </div>
        </>
      )}
      {r.status === 'done' && <div className="row"><ReportButton requestId={r.id} /></div>}
    </div>
  );
}

function Wanted({ w }) {
  const [remove, { isLoading }] = useRemoveWantMutation();
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <b className="sub row" style={{ gap: 8 }}><DietMark diet={w.diet} /> {mealName(w.meal)} · {dayText(w.day)}</b>
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} disabled={isLoading} onClick={() => remove(w.id)}><Busy on={isLoading} verb="Removing">Stop waiting</Busy></button>
    </div>
  );
}

/** True while `el` is on screen (used to hide the sticky bottom bar once the real summary card is visible). */
function useOnScreen() {
  const [el, setEl] = useState(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const watch = new IntersectionObserver(([e]) => setSeen(e.isIntersecting));
    watch.observe(el);
    return () => watch.disconnect();
  }, [el]);
  return [setEl, seen];
}

function Sell({ data, onDone }) {
  const { data: list, isLoading, error } = useBhandarSellableQuery();
  const [post, { isLoading: posting, error: postError }] = usePostListingsMutation();
  const [chosen, setChosen] = useState({}); // passId -> price text
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summaryRef, summarySeen] = useOnScreen();
  const dispatch = useDispatch();

  const passes = list?.passes ?? [];
  const byDay = useMemo(() => {
    const groups = {};
    passes.forEach((p) => (groups[p.day] ??= []).push(p));
    return Object.entries(groups);
  }, [passes]);
  const days = byDay.map(([d]) => d);

  const flip = (p) => setChosen((c) => {
    const next = { ...c };
    if (p.id in next) delete next[p.id];
    else next[p.id] = String(p.price);
    return next;
  });
  // "To" can't be before "From": the lists only offer valid days, and changing From resets a To that is now too early.
  const changeFrom = (d) => { setFrom(d); if (d && to && to < d) setTo(''); };
  const rangeOk = Boolean(from || to);
  const pickRange = () => {
    setChosen((c) => {
      const next = { ...c };
      passes.filter((p) => (!from || p.day >= from) && (!to || p.day <= to)).forEach((p) => { if (!(p.id in next)) next[p.id] = String(p.price); });
      return next;
    });
  };

  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  const items = passes.filter((p) => p.id in chosen).map((p) => ({ passId: p.id, price: Number(chosen[p.id]), face: p.price }));
  const bad = items.some((i) => !Number.isInteger(i.price) || i.price < 1 || i.price > i.face);
  const total = items.reduce((s, i) => s + (Number.isFinite(i.price) ? i.price : 0), 0);
  const summary = `${items.length} selected`;
  const submit = async () => {
    const res = await post(items.map(({ passId, price }) => ({ passId, price })));
    if (res.data) {
      dispatch(say(`${res.data.posted} coupon${res.data.posted > 1 ? 's' : ''} posted. Students waiting for them have been told.`));
      onDone();
    }
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="small">Pick the coupons you won&apos;t use. The price starts at face value and can only go down. Only coupon students in your year see them (boys and girls both).</p>
      {passes.length === 0 ? (
        <Empty title="No coupons to sell" art="meal-lunch">Coupons you hold for meals that haven&apos;t started, and that aren&apos;t listed yet, show up here.</Empty>
      ) : (
        <>
          <div className="card stack" style={{ gap: 10 }}>
            <b className="sub">Going away? Select a date range</b>
            <div className="row wrap" style={{ gap: 8 }}>
              <label className="field" style={{ flex: '1 1 130px' }}>From
                <select className="select" value={from} onChange={(e) => changeFrom(e.target.value)}>
                  <option value="">First day</option>{days.filter((d) => !to || d <= to).map((d) => <option key={d} value={d}>{dayText(d)}</option>)}
                </select>
              </label>
              <label className="field" style={{ flex: '1 1 130px' }}>To
                <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">Last day</option>{days.filter((d) => !from || d >= from).map((d) => <option key={d} value={d}>{dayText(d)}</option>)}
                </select>
              </label>
            </div>
            <div className="row wrap">
              <button className="btn sm" disabled={!rangeOk} onClick={pickRange}>Select these days</button>
              <button className="btn sm plain" onClick={() => { setChosen({}); setFrom(''); setTo(''); }}>Clear</button>
            </div>
          </div>

          {byDay.map(([day, list2]) => (
            <section key={day} className="stack" style={{ gap: 8 }}>
              <div className="eyebrow">{dayText(day)}</div>
              {list2.map((p) => {
                const on = p.id in chosen;
                const price = Number(chosen[p.id]);
                const over = on && (!Number.isInteger(price) || price < 1 || price > p.price);
                return (
                  <div key={p.id} className={`card stack ${on ? 'tone-lime' : ''}`} style={{ gap: 8, padding: 14 }}>
                    <label className="tick" style={{ minHeight: 44, alignItems: 'center' }}>
                      <input type="checkbox" checked={on} onChange={() => flip(p)} />
                      <b className="sub row" style={{ gap: 8 }}>{mealName(p.meal)} <DietMark diet={p.diet} /></b>
                      <span className="small muted" style={{ marginLeft: 'auto' }}>face ₹{p.price}</span>
                    </label>
                    {on && (
                      <label className="field">
                        Your price (₹{p.price} at most)
                        <input className="input" inputMode="numeric" value={chosen[p.id]} onChange={(e) => setChosen((c) => ({ ...c, [p.id]: e.target.value.replace(/[^0-9]/g, '') }))} aria-invalid={over} />
                        {over && <span className="small">Between ₹1 and ₹{p.price}.</span>}
                      </label>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </>
      )}
      {postError && <Problem>{postError && problemText(postError)}</Problem>}

      {/* Phones: this bar sticks to the bottom until the summary card below scrolls into view. */}
      {passes.length > 0 && (
        <div className={`basket-bar ${summarySeen ? 'away' : ''}`} aria-hidden={summarySeen} role="region" aria-label="Your listing">
          <div>
            <b className="display" style={{ fontSize: 22 }}>{items.length ? `₹${total}` : '₹0'}</b>
            <span className="tiny"> · {items.length} coupon{items.length === 1 ? '' : 's'}</span>
            <div className="tiny">{items.length ? (bad ? 'Fix the prices' : 'Ready to post') : 'Pick coupons to sell'}</div>
          </div>
          <button className={`btn ${items.length && !bad ? 'go' : ''}`} disabled={!items.length || bad || posting} onClick={submit}><Busy on={posting} verb="Posting">Post →</Busy></button>
        </div>
      )}
      <div ref={summaryRef} className="card lift stack" style={{ gap: 10 }}>
        <div className="row between wrap" style={{ gap: 8 }}>
          <b className="sub" style={{ fontSize: 18 }}>{summary}</b>
          <b className="display" style={{ fontSize: 24 }}>{items.length ? `₹${total} in all` : '₹0'}</b>
        </div>
        <button className="btn go lg block" disabled={!items.length || bad || posting} onClick={submit}><Busy on={posting} verb="Posting">Post for sale →</Busy></button>
        <p className="tiny muted">Students in your year who are waiting for these meals get an alert. Payment happens outside the app.</p>
      </div>
    </div>
  );
}

function Look({ data, onDone }) {
  const [day, setDay] = useState(data.days[0]);
  const [pick, setPick] = useState(null); // one meal at a time: { meal, diet }
  const [note, setNote] = useState('');
  const owned = (m) => data.holding.includes(`${day}|${m}`);
  const { data: found, isFetching, error } = useBhandarBrowseQuery({ day, meal: pick?.meal, diet: pick?.diet }, { skip: !pick });
  const [ask, { isLoading: asking, originalArgs, error: askError }] = useRequestListingMutation();
  const [want, { isLoading: wanting, error: wantError }] = useAddWantMutation();
  const [unwant, { isLoading: unwanting }] = useRemoveWantMutation();
  const dispatch = useDispatch();

  const choose = (m) => { setNote(''); setPick(pick?.meal === m ? null : { meal: m, diet: 'veg' }); };
  const request = async (id) => {
    const res = await ask(id);
    if (res.data) {
      dispatch(say('Requested. It is held for you for 30 minutes.'));
      onDone();
    }
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="small">Pick one meal at a time. You only see students from your own year.</p>
      <div className="chips" aria-label="Day" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        {data.days.map((d) => (
          <button key={d} className={`chip ${d === day ? 'on' : ''}`} aria-pressed={d === day} onClick={() => { setDay(d); setPick(null); setNote(''); }} style={{ flexShrink: 0 }}>{dayText(d)}</button>
        ))}
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {MEAL_SLOTS.map((m) => {
          const dish = data.menu?.[day]?.[m.id];
          const off = owned(m.id) ? 'You have it' : hasStarted(day, m.id, data.serverNow) ? 'Started' : null;
          if (off) {
            return (
              <button key={m.id} type="button" className="pick-off" aria-disabled="true"
                onClick={() => setNote(off === 'Started' ? `${m.name} on ${dayText(day)} has already started.` : `You already have a ${m.name.toLowerCase()} coupon for ${dayText(day)}.`)}>
                <Art name={`meal-${m.id}`} size={40} />
                <span style={{ flex: 1, textAlign: 'left' }}><b className="sub">{m.name}</b> <span className="small">{m.opens} – {m.closes}</span></span>
                <span className="sticker">{off}</span>
              </button>
            );
          }
          const on = pick?.meal === m.id;
          return (
            <div key={m.id} className={`pick-card ${on ? 'on' : ''}`}>
              <button type="button" className="pick-hit" aria-pressed={on} onClick={() => choose(m.id)}>
                <Art name={`meal-${m.id}`} size={52} />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span className="display" style={{ fontSize: 20, display: 'block' }}>{m.name}</span>
                  <span className="small">{m.opens} – {m.closes} · ₹{data.prices[m.id]}</span>
                </span>
                {!on && <span className="sticker">Pick</span>}
              </button>
              {on && (
                <div className="pick-body">
                  <Dishes dish={dish} />
                  <div className="diet-switch" role="radiogroup" aria-label={`${m.name}: veg or non-veg`}>
                    {dish?.nonveg ? ['veg', 'nonveg'].map((d) => (
                      <button key={d} role="radio" aria-checked={pick.diet === d} className={`diet ${d} ${pick.diet === d ? 'on' : ''}`} onClick={() => setPick({ meal: m.id, diet: d })}>
                        <DietMark diet={d} size={15} /> {d === 'veg' ? 'Veg' : 'Non-veg'}
                      </button>
                    )) : <span className="diet veg on" style={{ cursor: 'default' }}><DietMark diet="veg" size={15} /> Veg only</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {note && <div className="alert" role="status">{note}</div>}

      {!pick && <Empty title="Choose a meal">Tap a meal above to see who is selling it.</Empty>}
      {pick && isFetching && !found && <Loader />}
      {pick && error && <Problem error={error} />}
      {pick && found && !error && (
        <>
          {found.listings.length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              {found.listings.map((l) => (
                <div key={l.id} className="card stack" style={{ gap: 12 }}>
                  <div>
                    <b className="display" style={{ fontSize: 24 }}>₹{l.price}</b>
                    <span className="small muted"> · face ₹{l.face}</span>
                    <div className="small">A student in your year. Names show once you request it.</div>
                  </div>
                  <button className="btn go" style={{ alignSelf: 'flex-start' }} disabled={asking} onClick={() => request(l.id)}><Busy on={asking && originalArgs === l.id} verb="Requesting">Request</Busy></button>
                </div>
              ))}
              {askError && <Problem>{problemText(askError)}</Problem>}
            </div>
          )}
          {found.listings.length === 0 && (
            <Empty title="No one is selling this yet" art="meal-dinner">
              {found.want ? "You're on the waiting list. We'll alert you the moment someone lists it." : 'Want an alert the moment someone lists exactly this coupon?'}
              <div style={{ marginTop: 12 }}>
                {found.want ? (
                  <button className="btn sm" disabled={unwanting} onClick={() => unwant(found.want)}><Busy on={unwanting} verb="Removing">Stop waiting</Busy></button>
                ) : (
                  <button className="btn go" disabled={wanting} onClick={async () => { const res = await want({ day, meal: pick.meal, diet: pick.diet }); if (res.data) dispatch(say("Noted. We'll alert you when it's listed.")); }}>
                    <Icon name="bell" size={18} /> <Busy on={wanting} verb="Saving">Notify me</Busy>
                  </button>
                )}
              </div>
              {wantError && <div style={{ marginTop: 10 }}><Problem>{problemText(wantError)}</Problem></div>}
            </Empty>
          )}
        </>
      )}
    </div>
  );
}

function BhandarHome({ data, go }) {
  const incoming = data.listings.filter((l) => l.status === 'held' && l.request_id);
  const listings = data.listings.filter((l) => !incoming.includes(l));
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="bh-choices">
        <button className="bh-choice sell" onClick={() => go('sell')}>
          <Icon name="wallet" size={30} />
          <b className="display">I want to sell</b>
          <span className="small">List coupons you won&apos;t use</span>
        </button>
        <button className="bh-choice look" onClick={() => go('look')}>
          <Icon name="search" size={30} />
          <b className="display">I&apos;m looking for a coupon</b>
          <span className="small">Find or wait for one meal</span>
        </button>
      </div>

      {incoming.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2 className="display" style={{ fontSize: 22 }}>Needs your answer</h2>
          {incoming.map((l) => <Incoming key={l.id} listing={l} serverNow={data.serverNow} />)}
        </section>
      )}

      <section className="stack" style={{ gap: 10 }}>
        <h2 className="display" style={{ fontSize: 22 }}>Your listings</h2>
        {listings.length === 0 ? <Empty title="Nothing listed" art="meal-lunch">Coupons you put up for sale appear here.</Empty> : listings.map((l) => <MyListing key={l.id} l={l} />)}
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <h2 className="display" style={{ fontSize: 22 }}>Your requests</h2>
        {data.requests.length === 0 ? <Empty title="No requests yet" art="meal-dinner">When you ask for someone&apos;s coupon, you can follow it here.</Empty> : data.requests.map((r) => <MyRequest key={r.id} r={r} serverNow={data.serverNow} />)}
        <p className="tiny muted">You can have {data.maxRequests} open requests at a time. A request holds the coupon for you for {data.holdMinutes} minutes.</p>
      </section>

      {data.wants.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2 className="display" style={{ fontSize: 22 }}>Waiting for</h2>
          {data.wants.map((w) => <Wanted key={w.id} w={w} />)}
        </section>
      )}
    </div>
  );
}

function Bhandar() {
  const { data, isLoading, error } = useBhandarQuery(undefined, { pollingInterval: 20_000 });
  const [view, setView] = useState('home'); // home | sell | look
  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;
  const titles = { home: ['COUPON', 'BHANDAR.', 'Swap coupons with students in your year. Money is settled between you, outside the app.'], sell: ['SELL', 'COUPONS.', ''], look: ['FIND A', 'COUPON.', ''] };
  const [title, highlight, lead] = titles[view];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <Head loud title={title} highlight={highlight} lead={lead || undefined}>
        {view === 'home' ? <Art name="meal-lunch" size={64} /> : <button className="btn sm" onClick={() => setView('home')}><Icon name="back" size={16} /> Back</button>}
      </Head>
      {view === 'home' && <BhandarHome data={data} go={setView} />}
      {view === 'sell' && <Sell data={data} onDone={() => setView('home')} />}
      {view === 'look' && <Look data={data} onDone={() => setView('home')} />}
    </div>
  );
}

export default function BhandarPage() {
  return <CouponOnly><Bhandar /></CouponOnly>;
}
