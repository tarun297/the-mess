'use client';
import { useEffect, useRef, useState } from 'react';
import { useEntryScreenQuery } from '@/store/api';
import { Head, Loader, Problem, Icon, DietMark } from '@/components/kit';

// Put this on a screen at the mess door. Students scan the QR or type the code to check in.
export default function EntranceScreen() {
  const { data, isLoading, error, fulfilledTimeStamp } = useEntryScreenQuery(undefined, { pollingInterval: 3000 });
  const [qr, setQr] = useState(null);
  const [, tick] = useState(0);
  const box = useRef(null);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);

  const code = data?.code;
  useEffect(() => {
    if (!code) return;
    let live = true;
    import('qrcode')
      .then((QR) => QR.toDataURL(data.qrPrefix + code, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#121212', light: '#ffffff' } }))
      .then((url) => live && setQr(url))
      .catch(() => live && setQr(null));
    return () => { live = false; };
  }, [code, data?.qrPrefix]);

  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;

  const left = Math.max(0, data.msLeft - (Date.now() - (fulfilledTimeStamp ?? Date.now())));
  const R = 26;
  const C = 2 * Math.PI * R;
  const c = data.counts;

  return (
    <>
      <Head title="Entrance screen" lead={<span className="hide-phone">Show this on a screen at the door of {data.messTitle}. Go full screen on the TV or tablet.</span>}>
        <button className="btn" onClick={() => box.current?.requestFullscreen?.()}><Icon name="full" size={17} /> Full screen</button>
      </Head>
      <div className="entrance" ref={box}>
        <div className="row between wrap">
          <div>
            <div className="small" style={{ opacity: 0.7 }}>{data.messTitle}</div>
            <div className="display" style={{ fontSize: 30 }}>{data.meal ? `${data.meal.name} · ${data.meal.opens}–${data.meal.closes}` : 'No meal right now'}</div>
            {data.meal?.anyHour && <div className="small" style={{ opacity: 0.7 }}>Demo mode: check-ins now count toward {data.meal.name.toLowerCase()}.</div>}
            {!data.meal && data.next && <div className="small" style={{ opacity: 0.7 }}>Next: {data.next.name} at {data.next.opens}</div>}
          </div>
          <div className="display" style={{ fontSize: 28 }}>{data.clock}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className="sub bold" style={{ marginBottom: 16, fontSize: 18 }}>Scan the QR or type the code in THE MESS. to check in</div>
          <div className="row wrap" style={{ justifyContent: 'center', gap: 36 }}>
            {qr && <div className="entrance-qr"><img src={qr} alt={`QR code for check-in code ${data.code}`} /></div>}
            <div className="entrance-code" aria-live="polite">{data.code}</div>
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r={R} fill="none" stroke="#333" strokeWidth="6" />
              <circle cx="32" cy="32" r={R} fill="none" stroke="#D5E07C" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - left / data.sliceMs)} />
            </svg>
            <span>New code in <b className="display" style={{ fontSize: 20 }}>{Math.ceil(left / 1000)}s</b></span>
          </div>
        </div>

        <div className="tiles">
          <div className="entrance-panel">
            <div className="small" style={{ opacity: 0.7 }}>Served so far</div>
            {c ? (
              <>
                <div className="display" style={{ fontSize: 44 }}>{c.came} <span style={{ fontSize: 22, opacity: 0.6 }}>/ {c.expected}</span></div>
                <div className="bar lime" style={{ background: '#333', borderColor: '#555' }}><span style={{ width: `${c.expected ? Math.min(100, (c.came / c.expected) * 100) : 0}%` }} /></div>
                {c.veg != null && (
                  <div className="row small" style={{ gap: 16, marginTop: 10 }}>
                    <span className="row" style={{ gap: 6 }}><DietMark diet="veg" /> {c.veg} veg coupons</span>
                    <span className="row" style={{ gap: 6 }}><DietMark diet="nonveg" /> {c.nonveg ?? 0} non-veg</span>
                  </div>
                )}
              </>
            ) : <div className="small" style={{ opacity: 0.7, marginTop: 8 }}>Starts when the next meal opens.</div>}
          </div>
          <div className="entrance-panel">
            <div className="small" style={{ opacity: 0.7, marginBottom: 8 }}>Just checked in</div>
            {data.latest.length === 0 ? <div className="small" style={{ opacity: 0.7 }}>Nobody yet.</div> : data.latest.map((r, i) => (
              <div key={i} className="row between small" style={{ padding: '4px 0' }}>
                <span className="row" style={{ gap: 8 }}>{r.diet ? <DietMark diet={r.diet} size={14} /> : <span style={{ width: 14 }} />}{r.name} <span style={{ opacity: 0.6 }}>{r.roll}</span></span>
                <span style={{ opacity: 0.7 }}>{r.clock}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
