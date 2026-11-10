'use client';
// The bell in the top bar: a count of unread alerts and a list of them (coupon students only).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationsQuery, useReadNotificationsMutation } from '@/store/api';
import { Icon, Sheet, Loader, Problem, Empty, istStamp } from './kit';

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useNotificationsQuery(undefined, { pollingInterval: 30_000 });
  const [read] = useReadNotificationsMutation();
  const unread = data?.unread ?? 0;

  const go = async (n) => {
    if (!n.read_at) read(n.id);
    setOpen(false);
    router.push(n.link || '/bhandar');
  };

  return (
    <>
      <button className="btn sm bell-btn" onClick={() => setOpen(true)} aria-label={unread ? `Alerts, ${unread} new` : 'Alerts'}>
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <Sheet title="Alerts" onClose={() => setOpen(false)}>
          {isLoading && <Loader />}
          {error && <Problem error={error} />}
          {data && data.list.length === 0 && <Empty title="No alerts yet">New matches, requests and coupons you receive show up here.</Empty>}
          {data && data.list.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              {unread > 0 && <button className="btn sm plain" style={{ alignSelf: 'flex-end' }} onClick={() => read()}>Mark all as read</button>}
              {data.list.map((n) => (
                <button key={n.id} className={`note ${n.read_at ? '' : 'new'}`} onClick={() => go(n)}>
                  <b className="sub">{n.title}</b>
                  {n.body && <span className="small">{n.body}</span>}
                  <span className="tiny muted">{istStamp(n.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
