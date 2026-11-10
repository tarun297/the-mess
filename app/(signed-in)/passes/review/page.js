'use client';
import CouponOnly from '@/components/CouponOnly';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { useSaleQuery, useBuyPassesMutation, problemText } from '@/store/api';
import { selectPicks, empty } from '@/store/basketSlice';
import { say } from '@/store/toastSlice';
import { MEAL_SLOTS, mealName } from '@/server/catalog';
import { cartTotal, basketProblems } from '@/server/passRules';
import { Loader, Problem, Art, Scribble, Icon, DietMark, prettyDay, Busy, Confirm } from '@/components/kit';
import Receipt from '@/components/Receipt';

function ReviewScreen() {
  const { data: sale, isLoading, error } = useSaleQuery();
  const picks = useSelector(selectPicks);
  const [buy, { isLoading: paying, error: payError }] = useBuyPassesMutation();
  const [done, setDone] = useState(null);
  const [agree, setAgree] = useState(false);
  const [askPay, setAskPay] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();

  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  if (done) {
    return (
      <div className="stack" style={{ gap: 24, maxWidth: 640 }}>
        <header className="head"><div><h1 className="slant">YOU&apos;RE <span className="hl">SORTED.</span></h1><Scribble /><p>{done.count} coupons for the week of {prettyDay(done.week, { day: 'numeric', month: 'short' })}.</p></div></header>
        <div className="card lift tone-lime row wrap" style={{ gap: 18 }}>
          <Art name="meal-dinner" size={80} />
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 32 }}>₹{done.amount} paid</div>
            <div className="small">Receipt <b>{done.receipt}</b> · this is a demo payment, no real money moves.</div>
          </div>
        </div>
        <div className="row wrap">
          <Link href="/passes/wallet" className="btn go">See my coupons</Link>
          <Link href="/home" className="btn">Back home</Link>
        </div>
      </div>
    );
  }

  const total = cartTotal(picks, sale.prices);
  const problems = basketProblems(picks, sale, { boughtAlready: Boolean(sale.bought) });
  const byDay = sale.days.map((d) => ({ day: d, meals: picks.filter((p) => p.day === d) })).filter((g) => g.meals.length);

  const pay = async () => {
    const res = await buy(picks);
    if (res.data) {
      dispatch(empty());
      dispatch(say(`Paid ₹${res.data.amount}. Your coupons are in your wallet.`));
      setDone(res.data);
    }
  };

  return (
    <div className="stack" style={{ gap: 22 }}>
      <header className="head" style={{ marginBottom: 0 }}>
        <div>
          <Link href="/passes" className="small bold row" style={{ gap: 6, textDecoration: 'none' }}><Icon name="back" size={16} /> Back to planner</Link>
          <h1 className="slant" style={{ marginTop: 10 }}>CHECK YOUR <span className="hl">PLATE.</span></h1>
          <Scribble />
          <p>{picks.length} meals for the week of {prettyDay(sale.forWeek, { day: 'numeric', month: 'short' })}.</p>
        </div>
      </header>

      {picks.length === 0 ? (
        <div className="empty"><b>Nothing picked yet.</b><div className="small" style={{ marginTop: 6 }}><Link href="/passes">Go back and pick your meals.</Link></div></div>
      ) : (
        <div className="split">
          <section className="main-col card lift flush">
            <div className="card-bar tone-lime"><h2>Your week</h2><span className="sticker">{picks.length} meals</span></div>
            <div style={{ padding: '6px 20px' }}>
              {byDay.map((g) => (
                <div key={g.day} className="row between wrap" style={{ padding: '12px 0', borderBottom: '2px dashed rgba(18,18,18,.3)', gap: 10 }}>
                  <b className="sub">{prettyDay(g.day)}</b>
                  <span className="row wrap" style={{ gap: 6 }}>
                    {g.meals.map((p) => (
                      <span key={p.meal} className="sticker row" style={{ gap: 6, display: 'inline-flex' }}><DietMark diet={p.diet} size={13} /> {mealName(p.meal)} · ₹{sale.prices[p.meal]}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <aside className="side-col">
            <Receipt picks={picks} prices={sale.prices} total={total}>
              {problems.length > 0 && <Problem>{problems[0]}</Problem>}
              {payError && <Problem>{problemText(payError)}</Problem>}
              <label className="tick"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I understand unused coupons are not refunded.</label>
              <button className="btn go lg block" disabled={paying || problems.length > 0 || !agree} onClick={() => setAskPay(true)}>
                <Busy on={paying} verb="Buying">{`Pay ₹${total}`}</Busy>
              </button>
              {askPay && (
                <Confirm title={`Pay ₹${total}?`} yes="Pay" verb="Buying" busy={paying} onClose={() => setAskPay(false)} onYes={async () => { await pay(); setAskPay(false); }}>
                  You&apos;re buying {picks.length} coupon{picks.length === 1 ? '' : 's'}. This is final: unused coupons aren&apos;t refunded.
                </Confirm>
              )}
              <button className="btn plain" onClick={() => router.push('/passes')}>Change meals</button>
            </Receipt>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function Review() {
  return <CouponOnly><ReviewScreen /></CouponOnly>;
}
