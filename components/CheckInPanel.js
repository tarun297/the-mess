'use client';
// The check-in window: a big "Tap to scan" QR tile with the typed-code field below it.
// Used on the student home card and on the Check in tab. Locked until a meal hour is open.
// The server still decides everything (right mess, coupon, meal hours) - this is only the front door.
import { useCallback, useState } from 'react';
import { useEnterMutation, useDemoScanMutation, useSessionQuery, problemText } from '@/store/api';
import { Problem, Busy, Icon, Sheet } from './kit';
import QrScanner from './QrScanner';
import EntryResult from './EntryResult';

function QrGlyph() {
  // Three finder squares and a few "data" blocks, drawn in a soft tint of the tile colour.
  const f = (x, y) => (
    <g key={`${x}${y}`}>
      <rect x={x} y={y} width="30" height="30" rx="7" fill="none" stroke="currentColor" strokeWidth="6" />
      <rect x={x + 10} y={y + 10} width="10" height="10" rx="2" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox="0 0 90 90" width="100%" height="100%" aria-hidden="true" style={{ color: 'rgba(255,255,255,0.28)' }}>
      {f(2, 2)}{f(58, 2)}{f(2, 58)}
      <g fill="currentColor">
        <rect x="58" y="58" width="12" height="12" rx="3" /><rect x="76" y="58" width="12" height="12" rx="3" />
        <rect x="58" y="76" width="30" height="12" rx="6" /><rect x="40" y="40" width="12" height="12" rx="3" />
        <rect x="40" y="58" width="12" height="30" rx="6" /><rect x="40" y="2" width="12" height="30" rx="6" />
      </g>
    </svg>
  );
}

export default function CheckInPanel({ meal, next }) {
  // meal = the meal being served right now (or null). next = the meal that opens next.
  const open = !!meal;
  const [scanning, setScanning] = useState(false);
  const [about, setAbout] = useState(false);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [enter, { isLoading, error }] = useEnterMutation();
  const [demoScan, { error: demoError }] = useDemoScanMutation();
  const { data: sess } = useSessionQuery();

  const send = useCallback(async (value) => {
    setResult(null);
    const res = await enter(value);
    if (res.data) {
      setResult(res.data);
      setCode('');
    }
  }, [enter]);

  const scanned = useCallback((value) => {
    setScanning(false);
    setCode(value);
    send(value);
  }, [send]);

  // Demo mode (admin switch): the scanner pretends to read the QR after 2 seconds.
  const demoScanned = useCallback(async () => {
    setScanning(false);
    setResult(null);
    const res = await demoScan();
    if (res.data) setResult(res.data);
  }, [demoScan]);

  const closedNote = next ? `Check-in opens at ${next.opens} for ${next.name.toLowerCase()}.` : 'Check-in opens at the next meal.';

  return (
    <div className="stack" style={{ gap: 14 }}>
      {about && (
        <Sheet title="How it works" onClose={() => setAbout(false)}>
          <p className="small">Check-in is only open during meal hours. The code changes every 30 seconds and is different at every mess, so a code sent on WhatsApp stops working. Coupon students: your coupon for this meal is used when you check in, and the counter sees whether you get veg or non-veg.</p>
        </Sheet>
      )}
      {/* Phones: QR first. Wide screens have no camera to speak of, so they get the code field only. */}
      <div className="scan-part">
      {open && scanning ? (
        <div className="stack" style={{ gap: 10 }}>
          <QrScanner onCode={scanned} onDemo={sess?.demoScan ? demoScanned : undefined} />
          <button className="btn" onClick={() => setScanning(false)}>Close camera</button>
        </div>
      ) : (
        <div className="scan-wrap">
        <button type="button" className={`scan-tile ${open ? '' : 'locked'}`} disabled={!open} onClick={() => setScanning(true)}
          aria-label={open ? 'Tap to scan the QR on the entrance screen' : `Check-in is closed. ${closedNote}`}>
          <span className="scan-stars" aria-hidden="true" />
          <span className="scan-box">
            <span className="qr-bg"><QrGlyph /></span>
            <span className="scan-label">{open ? 'Tap to scan' : 'Check-in closed'}</span>
            <i className="cn tl" /><i className="cn tr" /><i className="cn bl" /><i className="cn br" />
          </span>
          <span className="scan-note">{open ? `${meal.name} is open until ${meal.closes}` : closedNote}</span>
        </button>
        <button type="button" className="scan-info" onClick={() => setAbout(true)} aria-label="How check-in works"><Icon name="info" size={18} /></button>
        </div>
      )}
      </div>

      <form className="stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); send(code.trim()); }}>
        <label className="field">
          <span className="row between">
            <span><span className="show-phone">Or type the code on the screen</span><span className="hide-phone">Type the code shown on the entrance screen</span></span>
            <button type="button" className="scan-info plain hide-phone" onClick={() => setAbout(true)} aria-label="How check-in works"><Icon name="info" size={18} /></button>
          </span>
          <input className="input code" value={code} maxLength={6} disabled={!open} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AB12CD" autoComplete="off" inputMode="text" />
        </label>
        {(error || demoError) && <Problem>{problemText(error || demoError)}</Problem>}
        <button className="btn lime lg" disabled={!open || code.trim().length !== 6 || isLoading}><Busy on={isLoading} verb="Checking in">Check in</Busy></button>
        {!open && <p className="small hide-phone" style={{ textAlign: 'center' }}>{closedNote}</p>}
      </form>

      {result && <EntryResult result={result} />}
    </div>
  );
}
