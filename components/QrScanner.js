'use client';
// Uses the phone camera to read the QR on the entrance screen, then hands back the code once.
// Decoding is done with jsQR, which works on Android, iPhone and laptops alike.
import { useEffect, useRef, useState } from 'react';
import { Loader } from './kit';

const PREFIX = 'THEMESS:';
/** "THEMESS:AB12CD" or a bare 6-character code -> the code, or null. */
export function readEntryQr(text) {
  const t = String(text || '').trim().toUpperCase();
  const raw = t.startsWith(PREFIX) ? t.slice(PREFIX.length) : t;
  return /^[A-Z0-9]{6}$/.test(raw) ? raw : null;
}

export default function QrScanner({ onCode, onDemo }) {
  const video = useRef(null);
  const [phase, setPhase] = useState('starting'); // starting | looking | scanned | failed
  const [note, setNote] = useState('');
  const [strayQr, setStrayQr] = useState(false);

  useEffect(() => {
    let stream;
    let frame;
    let done = false;
    const timers = [];
    // Flash "Scanned" for a moment, then hand over.
    const finish = (fn) => { done = true; setPhase('scanned'); timers.push(setTimeout(fn, 800)); };
    // Demo mode: pretend the QR was read after 2 seconds, even if the camera can't open.
    const demoSoon = () => { if (onDemo) timers.push(setTimeout(() => { if (!done) finish(onDemo); }, 2000)); };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setPhase('failed');
        setNote(onDemo ? 'No camera on this page. Simulating the scan for the demo…' : 'The camera only works on a secure (https) page. Type the code instead.');
        demoSoon();
        return;
      }
      try {
        const [{ default: jsQR }, cam] = await Promise.all([
          import('jsqr'),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
        ]);
        stream = cam;
        if (done) return stream.getTracks().forEach((t) => t.stop());
        video.current.srcObject = stream;
        await video.current.play();
        setPhase('looking');
        demoSoon();
        let last = 0;
        const look = (time) => {
          if (done) return;
          frame = requestAnimationFrame(look);
          const v = video.current;
          if (time - last < 160 || !v || v.readyState < 2 || !v.videoWidth) return;
          last = time;
          const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
          canvas.width = Math.round(v.videoWidth * scale);
          canvas.height = Math.round(v.videoHeight * scale);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (!hit) return;
          const code = readEntryQr(hit.data);
          if (code) finish(() => onCode(code));
          else setStrayQr(true);
        };
        frame = requestAnimationFrame(look);
      } catch (err) {
        setPhase('failed');
        setNote(onDemo ? "Couldn't open the camera. Simulating the scan for the demo…" : err?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow the camera for this site in your browser settings, or type the code.'
          : err?.name === 'NotFoundError' ? 'No camera on this device. Type the code instead.' : "Couldn't open the camera. Type the code instead.");
        demoSoon();
      }
    })();
    return () => {
      done = true;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode, onDemo]);

  if (phase === 'failed') return <div className="alert" role="alert">{note}</div>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="scanner">
        <video ref={video} playsInline muted />
        <div className="scanner-frame" aria-hidden="true" />
        {phase === 'starting' && <div className="scanner-wait"><Loader /></div>}
        {phase === 'scanned' && <div className="scanner-done" role="status"><b>✓ Scanned</b></div>}
      </div>
      <p className="small" style={{ textAlign: 'center' }}>
        {strayQr ? "That QR isn't from THE MESS. Point at the one on the entrance screen." : onDemo ? 'Demo: hold on, scanning the entrance QR…' : 'Point the camera at the QR on the entrance screen.'}
      </p>
    </div>
  );
}
