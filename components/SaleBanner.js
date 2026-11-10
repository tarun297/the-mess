'use client';
import { Countdown, Icon, prettyDay } from './kit';

/** Is the coupon sale open, in its Monday grace period, or shut? With a live countdown. */
export default function SaleBanner({ sale }) {
  const range = `${prettyDay(sale.days[0], { day: 'numeric', month: 'short' })} – ${prettyDay(sale.days[6], { day: 'numeric', month: 'short' })}`;
  const look = {
    open: ['tone-lime', 'Sales are open', `Buying for ${range}. Closes Sunday 11:59 PM; late buyers get until Monday dinner.`, 'Closes in', sale.endsAt],
    late: ['tone-orange', 'Last chance: Monday grace period', `Still buying for ${range}. Today's meals that have started are locked.`, 'Ends at dinner ·', sale.endsAt],
    shut: ['', 'Sales are closed', `Coupons for ${range} go on sale Saturday at 12:00 AM. Plan now, buy then.`, 'Opens in', sale.startsAt],
  }[sale.status];
  return (
    <div className={`card ${look[0]}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }} role="status">
      <Icon name={sale.status === 'shut' ? 'clock' : 'plan'} size={26} />
      <div style={{ flex: '1 1 260px' }}>
        <b className="sub" style={{ fontSize: 17 }}>{look[1]}</b>
        <div className="small">{look[2]}</div>
      </div>
      <b className="sub nowrap">{look[3]} <Countdown to={look[4]} serverNow={sale.serverNow} /></b>
    </div>
  );
}
