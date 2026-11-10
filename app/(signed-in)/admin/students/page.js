'use client';
import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAccountsQuery, useEditStudentMutation, problemText } from '@/store/api';
import { say } from '@/store/toastSlice';
import { MESSES } from '@/server/catalog';
import { Head, Loader, Problem, Empty, Icon, Confirm } from '@/components/kit';

export default function Students() {
  const { data, isLoading, error } = useAccountsQuery();
  const [edit, { error: saveError }] = useEditStudentMutation();
  const [q, setQ] = useState('');
  const [mess, setMess] = useState('');
  const [shown, setShown] = useState(30);
  const [pending, setPending] = useState(null); // { s, field, value } waiting for "Yes"
  const dispatch = useDispatch();

  const list = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.students.filter((s) => (!mess || s.mess === mess) && (!needle || s.name.toLowerCase().includes(needle) || s.roll.toLowerCase().includes(needle)));
  }, [data, q, mess]);

  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  const change = (s, field, value) => setPending({ s, field, value });
  const doChange = async ({ s, field, value }) => {
    const res = await edit({ id: s.id, [field]: field === 'year' ? Number(value) : value });
    if (res.data) dispatch(say(res.data.note ?? `${s.name} → ${res.data.student.messTitle}`, res.data.note ? 'bad' : 'good'));
  };

  return (
    <>
      {pending && (
        <Confirm title={`Change ${pending.s.name}?`} yes="Change it" verb="Saving" onClose={() => setPending(null)}
          onYes={async () => { await doChange(pending); setPending(null); }}>
          Set {pending.field} to <b>{pending.field === 'gender' ? (pending.value === 'M' ? 'male' : 'female') : pending.value}</b>. Their mess is worked out again from year, plan and gender.
        </Confirm>
      )}
      <Head title="Students" lead="A student's mess is worked out from year, plan and gender. Change any of them and the mess updates on its own." />
      <div className="segs" style={{ marginBottom: 12 }}>
        <button className={`seg ${!mess ? 'on' : ''}`} onClick={() => setMess('')}>All · {data.students.length}</button>
        {MESSES.map((m) => <button key={m.id} className={`seg ${mess === m.id ? 'on' : ''}`} onClick={() => setMess(m.id)}>{m.tag} · {data.perMess[m.id] ?? 0}</button>)}
      </div>
      <div className="search" style={{ marginBottom: 14 }}>
        <Icon name="search" size={17} />
        <input className="input" placeholder="Search name or roll number" value={q} onChange={(e) => { setQ(e.target.value); setShown(30); }} aria-label="Search students" />
      </div>
      {saveError && <div style={{ marginBottom: 12 }}><Problem>{problemText(saveError)}</Problem></div>}
      {list.length === 0 ? <Empty title="No students match">Try another name or roll number.</Empty> : (
        <div className="people">
          {list.slice(0, shown).map((s) => (
            <article key={s.id} className="person">
              <div className="person-who">
                <b>{s.name}</b>
                <div className="tiny muted">{s.roll} · {s.email}</div>
              </div>
              <span className={`sticker ${s.plan === 'coupon' ? 's-good' : 's-ok'}`}>{s.messTitle}</span>
              <div className="person-edit">
                <label className="field">Year
                  <select className="select" value={s.year} onChange={(e) => change(s, 'year', e.target.value)}>{[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}</option>)}</select>
                </label>
                <label className="field">Gender
                  <select className="select" value={s.gender} onChange={(e) => change(s, 'gender', e.target.value)}><option value="M">Male</option><option value="F">Female</option></select>
                </label>
                <label className="field">Plan
                  <select className="select" value={s.plan} disabled={s.year <= 2} title={s.year <= 2 ? '1st and 2nd years are always fixed plan' : ''} onChange={(e) => change(s, 'plan', e.target.value)}><option value="fixed">Fixed</option><option value="coupon">Coupon</option></select>
                </label>
              </div>
            </article>
          ))}
          {list.length > shown && <button className="btn block" onClick={() => setShown((n) => n + 30)}>Show {Math.min(30, list.length - shown)} more of {list.length - shown}</button>}
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 12 }}>Plans normally change only at the start of a semester.</p>
    </>
  );
}
