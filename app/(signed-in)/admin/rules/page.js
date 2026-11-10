'use client';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRulesQuery, useSaveRulesMutation, problemText } from '@/store/api';
import { say } from '@/store/toastSlice';
import { MEAL_SLOTS } from '@/server/catalog';
import { Head, Loader, Problem, Art, Busy, Confirm } from '@/components/kit';

export default function Rules() {
  const { data, isLoading, error } = useRulesQuery();
  const [save, { isLoading: saving, error: saveError }] = useSaveRulesMutation();
  const [form, setForm] = useState(null);
  const [ask, setAsk] = useState(false);
  const dispatch = useDispatch();
  useEffect(() => { if (data && !form) setForm({ prices: { ...data.prices }, minDays: data.minDays, escalateAfterHours: data.escalateAfterHours }); }, [data, form]);
  if (isLoading || !form) return <Loader />;
  if (error) return <Problem error={error} />;

  const day = MEAL_SLOTS.reduce((s, m) => s + Number(form.prices[m.id] || 0), 0);
  const changed = JSON.stringify(form) !== JSON.stringify({ prices: data.prices, minDays: data.minDays, escalateAfterHours: data.escalateAfterHours });
  const setPrice = (id, v) => setForm({ ...form, prices: { ...form.prices, [id]: v.replace(/\D/g, '') } });
  const submit = (e) => { e.preventDefault(); setAsk(true); };
  const doSave = async () => {
    const res = await save({ prices: Object.fromEntries(Object.entries(form.prices).map(([k, v]) => [k, Number(v)])), minDays: Number(form.minDays), escalateAfterHours: Number(form.escalateAfterHours) });
    setAsk(false);
    if (res.data) { dispatch(say('Rules saved. They apply from the next coupon sale.')); setForm(null); }
  };

  return (
    <>
      <Head title="Coupon rules" lead="Prices change every semester, so they live here, not in the code. Changes apply from the next coupon sale." />
      <form className="stack" style={{ gap: 18, maxWidth: 720 }} onSubmit={submit}>
        <section className="card stack">
          <h2 className="card-title">Meal prices</h2>
          <div className="price-grid">
            {MEAL_SLOTS.map((m) => (
              <label key={m.id} className="price">
                <Art name={`meal-${m.id}`} size={48} />
                <span className="bold">{m.name}</span>
                <span className="price-input">₹<input className="input" inputMode="numeric" value={form.prices[m.id]} onChange={(e) => setPrice(m.id, e.target.value)} aria-label={`${m.name} price`} /></span>
              </label>
            ))}
          </div>
          <p className="small muted">A full day costs <b style={{ color: '#121212' }}>₹{day}</b>.</p>
        </section>
        <section className="card stack">
          <h2 className="card-title">Weekly limits</h2>
          <label className="field">Minimum, in full days of meals
            <select className="select" value={form.minDays} onChange={(e) => setForm({ ...form, minDays: e.target.value })}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''} · ₹{day * d}</option>)}
            </select>
          </label>
          <p className="small muted">Maximum is always 7 full days: ₹{day * 7}. Sales run Saturday 00:00 to Sunday 23:59, with a grace period until Monday dinner.</p>
        </section>
        <section className="card stack">
          <h2 className="card-title">Feedback</h2>
          <label className="field">Escalate unresolved tickets to the mess society after
            <select className="select" value={form.escalateAfterHours} onChange={(e) => setForm({ ...form, escalateAfterHours: e.target.value })}>
              {[12, 24, 36, 48, 72, 96].map((h) => <option key={h} value={h}>{h} hours</option>)}
            </select>
          </label>
        </section>
        {ask && (
          <Confirm title="Save these rules?" yes="Save rules" verb="Saving" busy={saving} onClose={() => setAsk(false)} onYes={doSave}>
            New prices and limits apply from the next coupon sale, for every student.
          </Confirm>
        )}
        {saveError && <Problem>{problemText(saveError)}</Problem>}
        <div className="row"><button className="btn go lg" disabled={!changed || saving}><Busy on={saving} verb="Saving">Save rules</Busy></button>{changed && <button type="button" className="btn plain" onClick={() => setForm(null)}>Undo changes</button>}</div>
      </form>
    </>
  );
}
