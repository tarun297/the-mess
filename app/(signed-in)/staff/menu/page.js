'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMenuQuery, useEditMenuMutation, problemText } from '@/store/api';
import { selectAccount } from '@/store/accountSlice';
import { say } from '@/store/toastSlice';
import { MEAL_SLOTS, WEEKDAYS, WEEKDAYS_SHORT, menuGroupOf } from '@/server/catalog';
import { Head, Loader, Problem, Art, DietMark, Icon, Busy, Confirm } from '@/components/kit';
import Dishes from '@/components/Dishes';

function MealEditor({ weekday, slot, dish }) {
  const [form, setForm] = useState(null);
  const [save, { isLoading, error }] = useEditMenuMutation();
  const dispatch = useDispatch();
  const open = () => setForm({ common: dish.common, veg: dish.veg ?? '', nonveg: dish.nonveg ?? '' });
  const [ask, setAsk] = useState(false);
  const submit = (e) => { e.preventDefault(); setAsk(true); };
  const doSave = async () => {
    const res = await save({ weekday, meal: slot.id, ...form });
    setAsk(false);
    if (res.data) {
      dispatch(say(`${WEEKDAYS[weekday]} ${slot.name.toLowerCase()} updated.`));
      setForm(null);
    }
  };
  return (
    <section className="card lift stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 12 }}>
        <Art name={`meal-${slot.id}`} size={40} />
        <b className="sub" style={{ flex: 1, fontSize: 16 }}>{slot.name}</b>
        {!form && <button className="btn sm" onClick={open}><Icon name="pencil" size={15} /> Edit</button>}
      </div>
      {!form ? <Dishes dish={dish} /> : (
        <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
          <label className="field">Everyone gets<input className="input" value={form.common} onChange={(e) => setForm({ ...form, common: e.target.value })} maxLength={160} /></label>
          <label className="field"><span className="row" style={{ gap: 6 }}><DietMark diet="veg" /> Veg dish (optional)</span><input className="input" value={form.veg} onChange={(e) => setForm({ ...form, veg: e.target.value })} maxLength={60} placeholder="Paneer masala" /></label>
          <label className="field"><span className="row" style={{ gap: 6 }}><DietMark diet="nonveg" /> Non-veg dish (leave empty for a veg-only meal)</span><input className="input" value={form.nonveg} onChange={(e) => setForm({ ...form, nonveg: e.target.value })} maxLength={60} placeholder="Egg curry" /></label>
          {error && <Problem>{problemText(error)}</Problem>}
          <div className="row"><button className="btn go" disabled={isLoading}><Busy on={isLoading} verb="Saving">Save</Busy></button><button type="button" className="btn plain" onClick={() => setForm(null)}>Cancel</button></div>
          {ask && (
            <Confirm title={`Save ${WEEKDAYS[weekday]} ${slot.name.toLowerCase()}?`} yes="Save" verb="Saving" busy={isLoading} onClose={() => setAsk(false)} onYes={doSave}>
              Everyone at your mess sees the new menu straight away.
            </Confirm>
          )}
        </form>
      )}
    </section>
  );
}

export default function MenuEditor() {
  const me = useSelector(selectAccount);
  const { data, isLoading, error } = useMenuQuery();
  const [day, setDay] = useState(null);
  if (isLoading || !me) return <Loader />;
  if (error) return <Problem error={error} />;
  const d = day ?? data.todayIndex;
  return (
    <>
      <Head title="Edit menu" lead={`${menuGroupOf(me.mess).title}. ${me.mess === 'FY' ? 'This menu is used by the First-Year Mess only.' : 'This menu is used by Main and Coupon messes (boys and girls).'} Students see changes straight away. Removing a non-veg dish makes that meal veg-only for future coupon sales.`} />
      <div className="segs" style={{ marginBottom: 16 }}>
        {WEEKDAYS_SHORT.map((w, i) => <button key={w} className={`seg ${d === i ? 'on' : ''}`} onClick={() => setDay(i)}>{w}{i === data.todayIndex ? ' · today' : ''}</button>)}
      </div>
      <h2 className="card-title" style={{ marginBottom: 12 }}>{WEEKDAYS[d]}</h2>
      <div className="tiles" style={{ alignItems: 'start' }}>
        {MEAL_SLOTS.map((m) => <MealEditor key={`${d}-${m.id}`} weekday={d} slot={m} dish={data.week[d][m.id]} />)}
      </div>
    </>
  );
}
