'use client';
import { DietMark, Icon } from './kit';

const LOOK = {
  in: ['good', 'check'],
  already: ['stop', 'close'],
  no_pass: ['stop', 'close'],
  wrong_mess: ['wait', 'arrow'],
  bad_code: ['wait', 'clock'],
  closed: ['wait', 'clock'],
  unknown: ['wait', 'search'],
};

/** The big result card after a check-in. Staff read it from across the counter. */
export default function EntryResult({ result, forStaff = false }) {
  if (!result) return null;
  const [tone, icon] = LOOK[result.outcome] ?? ['wait', 'clock'];
  return (
    <div className={`result ${tone} fade-in`} role="status" aria-live="polite">
      <div className="row" style={{ gap: 12 }}>
        <span style={{ width: 46, height: 46, borderRadius: '50%', border: '2.5px solid #121212', background: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={24} width={3} />
        </span>
        <h3>{result.headline}</h3>
      </div>
      <p style={{ fontSize: 16 }}>{result.detail}</p>
      {result.outcome === 'in' && result.serve && (
        <div className={`serve ${result.serve}`}>
          <DietMark diet={result.serve} size={forStaff ? 30 : 22} />
          <span>Serve {result.serve === 'veg' ? 'VEG' : 'NON-VEG'}{result.serveDish ? ` · ${result.serveDish}` : ''}</span>
        </div>
      )}
      {result.outcome === 'in' && !result.serve && (
        <div className="serve open"><span>Fixed plan · veg or non-veg, their choice</span></div>
      )}
      {result.who && (
        <p className="small">
          <b>{result.who.name}</b> · {result.who.roll} · {result.who.plan === 'coupon' ? 'Coupon plan' : 'Fixed plan'}
          {result.mealName ? ` · ${result.mealName}` : ''}
          {result.anyHour ? ' · demo: outside meal hours' : ''}
        </p>
      )}
    </div>
  );
}
