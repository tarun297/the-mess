'use client';
import { MEAL_SLOTS } from '@/server/catalog';
import { DietMark } from './kit';

/** The paper receipt that sums up a basket: tape on top, dashed rules, zigzag bottom. */
export default function Receipt({ picks, prices, total, floor, ceiling, hint, children, title = 'THE MESS. · COUPON RECEIPT' }) {
  const count = (id) => picks.filter((p) => p.meal === id).length;
  const fill = Math.min(100, Math.round((total / ceiling) * 100));
  return (
    <div className="receipt-wrap">
      <span className="tape" aria-hidden="true" style={{ left: '50%', top: -12, marginLeft: -48, transform: 'rotate(-4deg)' }} />
      <div className="receipt">
        <div className="eyebrow" style={{ textAlign: 'center' }}>{title}</div>
        <hr />
        {MEAL_SLOTS.map((m) => (
          <div key={m.id} className="row between sub" style={{ fontWeight: 500 }}>
            <span>{m.name} × {count(m.id)}</span><b>₹{count(m.id) * prices[m.id]}</b>
          </div>
        ))}
        <div className="row small" style={{ gap: 14 }}>
          <span className="row" style={{ gap: 6 }}><DietMark diet="veg" size={14} /> {picks.filter((p) => p.diet !== 'nonveg').length} veg</span>
          <span className="row" style={{ gap: 6 }}><DietMark diet="nonveg" size={14} /> {picks.filter((p) => p.diet === 'nonveg').length} non-veg</span>
        </div>
        <hr />
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <b className="sub">TOTAL</b>
          <span className="display" style={{ fontSize: 44, lineHeight: 1 }}>₹{total}</span>
        </div>
        {floor != null && (
          <>
            <div className={`bar ${total >= floor ? 'lime' : ''}`} aria-hidden="true"><span style={{ width: `${fill}%` }} /></div>
            <b className="sub small">{hint ?? (total > ceiling ? `Over the ₹${ceiling} weekly limit.` : 'Minimum reached. Ready to pay.')}</b>
          </>
        )}
        {children}
        <svg width="100%" height="12" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
          <path d="M0 0l10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12 10 12 10-12" fill="none" stroke="#121212" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
