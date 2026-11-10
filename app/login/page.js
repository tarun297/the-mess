'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { messApi, useSignInMutation, problemText } from '@/store/api';
import { ROLES, MEAL_SLOTS, STARTING_RULES } from '@/server/catalog';
import { Logo, Grain, Art, Problem, Icon, Busy } from '@/components/kit';

const SAMPLES = [
  { group: 'Students', list: [
    { login: 'tarun@iiit-bh.demo', who: 'Tarun K. Behera', note: '4th year · coupon plan · Coupon Mess Boys' },
    { login: 'nishchal@iiit-bh.demo', who: 'Nishchal Panda', note: '4th year · coupon plan · sales always open, fresh wallet each login' },
    { login: 'saniya@iiit-bh.demo', who: 'Saniya Khan', note: '1st year · girl · First-Year Mess' },
    { login: 'soham@iiit-bh.demo', who: 'Soham Mishra', note: '2nd year · fixed plan · Main Mess Boys' },
    { login: 'naina@iiit-bh.demo', who: 'Naina Sahoo', note: '3rd year · coupon plan · Coupon Mess Girls' },
  ] },
  { group: 'Mess team', list: [
    { login: 'staff.cpnb@iiit-bh.demo', who: 'Mess staff', note: 'Coupon Mess · Boys' },
    { login: 'society@iiit-bh.demo', who: 'Mess society', note: 'Inspects every mess' },
    { login: 'admin@iiit-bh.demo', who: 'Admin', note: 'Hostel office' },
  ] },
];

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [signIn, { isLoading, error }] = useSignInMutation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showSamples, setShowSamples] = useState(false);

  const go = async (id, pw) => {
    const res = await signIn({ login: id, password: pw });
    if (res.data) {
      dispatch(messApi.util.resetApiState());
      router.replace(ROLES[res.data.account.role].home);
    }
  };

  return (
    <div className="login">
      <Grain />
      <div className="login-deco" aria-hidden="true">
        <div className="checker login-checker-a" />
        <div className="checker login-checker-b" />
        <div className="login-receipt">MENU ✓<br />COUPONS ✓<br />CHECK-IN ✓<br />RATINGS ✓</div>
        <div className="login-jalebi"><Art name="food-jalebi" size={124} /></div>
        <div className="login-scene"><img src="/art/thali-scene.svg" alt="" /></div>
      </div>

      <header className="login-top">
        <Logo size={26} />
        <a className="btn sm" href="#samples" onClick={() => setShowSamples(true)}>Try a demo account</a>
      </header>

      <main className="login-main">
        <h1 className="login-title">YOUR MESS,<br /><span>ON TIME.</span></h1>
        <p className="login-lead">Coupons in a minute, check-in in a second. For every IIIT-BH mess.</p>

        <form
          className="login-card"
          onSubmit={(e) => {
            e.preventDefault();
            go(login, password);
          }}
        >
          <span className="tape" aria-hidden="true" style={{ left: '50%', top: -14, marginLeft: -48, transform: 'rotate(-3deg)' }} />
          <h2 className="display" style={{ fontSize: 26 }}>Log in</h2>
          <label className="field">
            Email or roll number
            <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="B423070 or name@iiit-bh.demo" autoComplete="username" required />
          </label>
          <label className="field">
            Password
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <Problem>{problemText(error)}</Problem>}
          <button className="btn go lg block" disabled={isLoading}><Busy on={isLoading} verb="Logging in">Log in <Icon name="arrow" size={18} /></Busy></button>
        </form>

        <section id="samples" className="login-samples">
          <button className="btn sm" type="button" onClick={() => setShowSamples((v) => !v)} aria-expanded={showSamples}>
            {showSamples ? 'Hide demo accounts' : 'Show demo accounts'}
          </button>
          {showSamples && (
            <div className="login-sample-box fade-in">
              <p className="small">One tap logs you in. Password for every demo account: <b>demo1234</b></p>
              {SAMPLES.map((g) => (
                <div key={g.group} className="stack" style={{ gap: 8 }}>
                  <div className="eyebrow">{g.group}</div>
                  {g.list.map((s) => (
                    <button key={s.login} type="button" className="sample" disabled={isLoading} onClick={() => go(s.login, 'demo1234')}>
                      <span><b>{s.who}</b><span className="small muted"> · {s.note}</span></span>
                      <Icon name="arrow" size={16} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="login-times" aria-label="Meal times">
          {MEAL_SLOTS.map((m) => (
            <span key={m.id} className="sticker">{m.name} {m.opens}–{m.closes} · ₹{STARTING_RULES.prices[m.id]}</span>
          ))}
        </div>
      </main>
      <footer className="login-foot small">Built by Tarun K · B423070</footer>
    </div>
  );
}
