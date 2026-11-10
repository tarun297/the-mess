'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useOverviewQuery, useKitchenQuery } from '@/store/api';
import { MEAL_SLOTS, MESSES } from '@/server/catalog';
import { Head, Loader, Problem, Icon } from '@/components/kit';
import KitchenView from '@/components/KitchenView';

export default function SocietyDashboard() {
  const { data, isLoading, error } = useOverviewQuery(undefined, { pollingInterval: 30_000 });
  const [mess, setMess] = useState('CPN-B');
  const { data: kitchen } = useKitchenQuery(mess);
  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;
  const sum = (f) => data.messes.reduce((s, m) => s + f(m), 0);

  return (
    <>
      <Head title="Every mess, today" lead="Attendance, open tickets, ratings and the last inspection for each mess.">
        <Link href="/society/inspect" className="btn go"><Icon name="shield" size={17} /> Start an inspection</Link>
      </Head>
      <div className="tiles-sm stats" style={{ marginBottom: 20 }}>
        <div className="card lift"><div className="stat-label">Students</div><div className="stat">{sum((m) => m.students)}</div></div>
        <div className="card lift tone-violet"><div className="stat-label" style={{ color: '#fff' }}>Escalated</div><div className="stat">{sum((m) => m.tickets.escalated)}</div></div>
        <div className="card lift"><div className="stat-label">Open</div><div className="stat">{sum((m) => m.tickets.open + m.tickets.acknowledged)}</div></div>
        <div className="card lift"><div className="stat-label">Served today</div><div className="stat">{sum((m) => m.today.reduce((s, x) => s + x.came, 0))}</div></div>
      </div>

      <div className="mess-cards">
        {data.messes.map((m) => (
          <section key={m.id} className="card lift stack" style={{ gap: 10 }}>
            <div className="row between">
              <div><b className="sub" style={{ fontSize: 16 }}>{m.title}</b><div className="tiny muted">{m.students} students · {m.plan === 'coupon' ? 'Coupon plan' : 'Fixed plan'}</div></div>
              {m.tickets.escalated > 0 && <span className="sticker s-escalated">{m.tickets.escalated} escalated</span>}
            </div>
            <div className="meal-mini">
              {m.today.map((x) => (
                <div key={x.meal}>
                  <div className="tiny muted">{MEAL_SLOTS.find((s) => s.id === x.meal).name}</div>
                  <b>{x.came}<span className="muted" style={{ fontWeight: 500 }}> / {x.expected}</span></b>
                </div>
              ))}
            </div>
            <div className="row wrap small" style={{ gap: '4px 14px' }}>
              <span>Tickets open: <b>{m.tickets.open + m.tickets.acknowledged}</b></span>
              <span>Rating: <b>{m.rating ? `${m.rating}★` : '—'}</b></span>
              <span>Inspection: {m.inspection ? <span className={`sticker s-${m.inspection.verdict.toLowerCase()}`} style={{ padding: '1px 6px' }}>{m.inspection.total}/30 {m.inspection.verdict}</span> : '—'}</span>
            </div>
          </section>
        ))}
      </div>

      <div className="row between wrap" style={{ margin: '28px 0 12px', gap: 10 }}>
        <h2 className="card-title">Cook-for check</h2>
        <div className="segs">{MESSES.map((m) => <button key={m.id} className={`seg ${mess === m.id ? 'on' : ''}`} onClick={() => setMess(m.id)}>{m.tag}</button>)}</div>
      </div>
      {kitchen ? <KitchenView key={mess} data={kitchen} /> : <Loader />}
    </>
  );
}
