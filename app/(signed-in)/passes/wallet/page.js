'use client';
import CouponOnly from '@/components/CouponOnly';
import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { useWalletQuery, useGivePassMutation, useCheckFriendMutation, problemText } from '@/store/api';
import { say } from '@/store/toastSlice';
import { MEAL_SLOTS, mealName } from '@/server/catalog';
import { Loader, Problem, Art, Scribble, Icon, Modal, Empty, DietMark, prettyDay, istDay, Busy } from '@/components/kit';
import CouponTabs from '@/components/CouponTabs';

function GiveDialog({ pass, onClose }) {
  const [roll, setRoll] = useState('');
  const [friend, setFriend] = useState(null);
  const [lookUp, { isLoading: looking, error: lookError, reset }] = useCheckFriendMutation();
  const [give, { isLoading, error }] = useGivePassMutation();
  const dispatch = useDispatch();
  const check = async (e) => {
    e.preventDefault();
    const res = await lookUp({ id: pass.id, roll: roll.trim() });
    if (res.data) setFriend(res.data.to);
  };
  const confirm = async () => {
    const res = await give({ id: pass.id, roll: friend.roll });
    if (res.data) {
      dispatch(say(`${mealName(pass.meal)} coupon given to ${res.data.to.name}.`));
      onClose();
    }
  };
  return (
    <Modal title={friend ? 'Give it to them?' : 'Give this coupon'} onClose={onClose}>
      <div className="stack">
        <div className="row" style={{ gap: 12 }}>
          <Art name={`meal-${pass.meal}`} size={52} />
          <div><b className="sub row" style={{ gap: 6 }}>{mealName(pass.meal)} <DietMark diet={pass.diet} size={14} /></b><div className="small">{prettyDay(pass.day, { weekday: 'long', day: 'numeric', month: 'short' })}</div>{pass.plate && <div className="tiny">{pass.plate}</div>}</div>
        </div>
        {!friend ? (
          <form className="stack" onSubmit={check}>
            <label className="field">
              Friend&apos;s roll number
              <input className="input" value={roll} onChange={(e) => { setRoll(e.target.value.toUpperCase()); reset(); }} placeholder="B522041" autoFocus />
            </label>
            <p className="small muted">They must be on the coupon plan, in your year, and not already have this meal. Boys and girls can share.</p>
            {lookError && <Problem>{problemText(lookError)}</Problem>}
            <button className="btn go block" disabled={!roll.trim() || looking}><Busy on={looking} verb="Checking">Next</Busy></button>
          </form>
        ) : (
          <>
            <div className="card tone-lime" style={{ padding: 14 }}>
              <div className="tiny bold">GIVING TO</div>
              <b className="display" style={{ fontSize: 22 }}>{friend.name}</b>
              <div className="small">{friend.roll}</div>
            </div>
            <p className="small">Once given, it&apos;s theirs. You can&apos;t take it back.</p>
            {error && <Problem>{problemText(error)}</Problem>}
            <div className="row">
              <button className="btn go" onClick={confirm} disabled={isLoading}><Icon name="gift" size={18} /> <Busy on={isLoading} verb="Giving">Yes, give it</Busy></button>
              <button className="btn plain" onClick={() => setFriend(null)}>Change roll number</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

const STATE = { ready: ['Ready', 's-resolved'], used: ['Used', 's-open'], expired: ['Expired', 's-open'] };

function WalletScreen() {
  const [week, setWeekParam] = useState(null);
  const { data, isLoading, isFetching, error } = useWalletQuery(week);
  const [giving, setGiving] = useState(null);

  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  const days = [...new Set(data.passes.map((p) => p.day))];
  const t = data.tally;

  return (
    <div className="stack" style={{ gap: 22 }}>
      <CouponTabs />
      <header className="head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="slant">MY <span className="hl">COUPONS.</span></h1>
          <Scribble />
          <p>Week of {prettyDay(data.week, { day: 'numeric', month: 'short' })}{data.week === data.thisWeek ? ' (this week)' : ''}.</p>
        </div>
        <div className="row">
          <button className="btn sm" onClick={() => setWeekParam(data.earlier)} disabled={isFetching}><Icon name="back" size={16} /> Earlier</button>
          <button className="btn sm" onClick={() => setWeekParam(data.later)} disabled={isFetching}>Later <Icon name="arrow" size={16} /></button>
        </div>
      </header>

      <div className="tiles-sm stats">
        <div className="card lift tone-lime"><div className="stat-label">Ready to use</div><div className="stat">{t.ready}</div></div>
        <div className="card lift"><div className="stat-label">Eaten</div><div className="stat">{t.used}</div></div>
        <div className="card lift"><div className="stat-label">Expired</div><div className="stat">{t.expired}</div></div>
        <div className="card lift tone-orange"><div className="stat-label">Spent</div><div className="stat">₹{t.spent}</div></div>
      </div>

      {data.passes.length === 0 ? (
        <Empty title="No coupons for this week" art="meal-lunch">
          <Link href="/passes">Plan a week of meals →</Link>
        </Empty>
      ) : (
        <section className="card lift">
          {days.map((d) => (
            <div key={d} className={`wallet-day ${d === data.today ? 'today' : ''}`}>
              <div className="wallet-date">
                <div className="eyebrow" style={{ fontSize: 11 }}>{prettyDay(d, { weekday: 'short' })}</div>
                <div className="display" style={{ fontSize: 24 }}>{Number(d.slice(8))}</div>
                {d === data.today && <div className="tiny bold">TODAY</div>}
              </div>
              <div className="pass-list">
                {MEAL_SLOTS.map((m) => data.passes.find((p) => p.day === d && p.meal === m.id)).filter(Boolean).map((p) => (
                  <div key={p.id} className={`pass ${p.state}`}>
                    <Art name={`meal-${p.meal}`} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b className="sub row" style={{ gap: 6 }}>{mealName(p.meal)} <DietMark diet={p.diet} size={14} /></b>
                      <div><span className={`sticker ${STATE[p.state][1]}`} style={{ fontSize: 10, padding: '2px 6px' }}>{STATE[p.state][0]}</span></div>
                      {p.plate && <div className="tiny" style={{ marginTop: 3, lineHeight: 1.35 }}>{p.plate}</div>}
                      {p.giftFrom && <div className="tiny muted">From {p.giftFrom}</div>}
                    </div>
                    {p.canGive && (
                      <button className="btn sm" style={{ minHeight: 40, padding: '0 10px' }} onClick={() => setGiving(p)} aria-label={`Give ${mealName(p.meal)} on ${d}`}>
                        <Icon name="gift" size={17} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="stack" style={{ gap: 12 }}>
        <h2 className="display" style={{ fontSize: 24 }}>Given and received</h2>
        {data.gifts.length === 0 ? (
          <p className="small muted">Can&apos;t make a meal? Tap the gift icon on a coupon to give it to a coupon-plan friend in your year before it starts.</p>
        ) : (
          <div className="table-box">
            <table className="grid">
              <thead><tr><th>When</th><th>Meal</th><th>Who</th></tr></thead>
              <tbody>
                {data.gifts.map((g, i) => (
                  <tr key={i}>
                    <td>{istDay(g.at)}</td>
                    <td>{mealName(g.meal)}, {prettyDay(g.day)}</td>
                    <td>{g.way === 'gave' ? `You gave it to ${g.receiver} (${g.receiver_roll})` : `${g.giver} gave it to you`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {giving && <GiveDialog pass={giving} onClose={() => setGiving(null)} />}
    </div>
  );
}

export default function Wallet() {
  return <CouponOnly><WalletScreen /></CouponOnly>;
}
