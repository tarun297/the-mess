'use client';
// Small building blocks used across every screen.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { dismiss } from '@/store/toastSlice';
import { TICKET_STATES } from '@/server/catalog';

/** THE MESS. sticker logo: a tilted paper card with a strip of tape. `size` = font size in px. */
export function Logo({ size = 28 }) {
  return (
    <span className="logo" style={{ fontSize: size }} aria-label="THE MESS.">
      <span className="tape" aria-hidden="true" />
      <span className="logo-card" aria-hidden="true">
        <span>THE<br />MESS.</span>
      </span>
    </span>
  );
}

/** Paper grain behind loud screens. */
export function Grain() {
  return (
    <svg className="grain" aria-hidden="true">
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.35 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain)" />
    </svg>
  );
}

/** Orange hand-drawn underline. */
export function Scribble({ width = 200 }) {
  return (
    <svg className="scribble" width={width} height="16" viewBox="0 0 200 16" aria-hidden="true">
      <path d="M4 10C60 2 120 4 196 8M30 14C80 8 130 10 180 11" fill="none" stroke="#FF6B1A" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Meal and food illustrations (files in /public/art). */
export function Art({ name, size = 64, alt = '' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/art/${name}.svg`} width={size} height={size} alt={alt} style={{ display: 'block', flexShrink: 0 }} />;
}

const PATHS = {
  home: 'M3 11l9-7 9 7v9h-6v-6H9v6H3z',
  menu: 'M7 3v7a2 2 0 0 0 4 0V3M9 3v18M17 3c-2 0-3 2.5-3 5s1 4 3 4 3-1.5 3-4-1-5-3-5zM17 12v9',
  plan: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  wallet: 'M3 6h18v13H3zM3 10h18M16 15h2',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16',
  talk: 'M4 5h16v11H9l-5 4z',
  screen: 'M3 4h18v12H3zM8 20h8M12 16v4',
  keypad: 'M5 4h14v16H5zM9 8h.01M12 8h.01M15 8h.01M9 12h.01M12 12h.01M15 12h.01M9 16h6',
  pot: 'M4 11h16M6 11c0 0-1 9 6 9s6-9 6-9M9 8h6M12 5v3',
  pencil: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  board: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  check: 'M4 12l5 5L20 6',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6',
  rules: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  swap: 'M7 7h13l-3.5-3.5M17 17H4l3.5 3.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  star: 'M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6l-6 3.3 1.3-6.7-5-4.7 6.8-.8z',
  close: 'M6 6l12 12M18 6L6 18',
  full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  thumb: 'M7 11v9H4v-9zM7 11l4-8c2 0 3 1 3 3v3h5a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
};

/** Line icons drawn for this app. */
export function Icon({ name, size = 20, stroke = 'currentColor', width = 2.4, fill = 'none', label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Page loader. The look depends on where you are: logo stamp (full screen), receipt (coupons),
 *  checker strip (staff / society / admin) or the thali that fills up (everything else). */
export function Loader({ full = false }) {
  const path = usePathname() || '';
  const kind = full ? 'stamp' : /^\/(staff|society|admin)(\/|$)/.test(path) ? 'strip' : /^\/passes(\/|$)/.test(path) ? 'receipt' : 'thali';
  return (
    <div className={`loader ${full ? 'full' : ''}`} role="status" aria-label="Loading">
      {kind === 'stamp' && <div className="stamp-logo"><Logo size={30} /></div>}
      {kind === 'receipt' && (
        <div className="rc" aria-hidden="true">
          <div className="slot" />
          <div className="paper"><i /><i /><i /><i /></div>
        </div>
      )}
      {kind === 'strip' && <div className="strip" aria-hidden="true"><i /></div>}
      {kind === 'thali' && <div className="thali" aria-hidden="true"><i /><i /><i /><i /></div>}
    </div>
  );
}

/** Button label that turns into "Verb + hopping squares" while saving. Both labels share one
 *  grid cell, so the button keeps its width and nothing jumps.
 *  Use: <button disabled={saving}><Busy on={saving} verb="Buying">Buy</Busy></button> */
export function Busy({ on, verb, children }) {
  return (
    <span className="busy">
      <span style={on ? { visibility: 'hidden' } : undefined}>{children}</span>
      <span style={on ? undefined : { visibility: 'hidden' }} aria-hidden={!on}>
        {verb}
        <span className="dots" aria-hidden="true"><i /><i /><i /></span>
      </span>
    </span>
  );
}

export function Problem({ error, children }) {
  if (!error && !children) return null;
  return <div className="alert" role="alert">{children ?? (error?.data?.error || 'Something went wrong. Try again.')}</div>;
}

export function Empty({ title, children, art }) {
  return (
    <div className="empty">
      {art && <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10 }}><Art name={art} size={72} /></div>}
      <div className="bold" style={{ fontSize: 16 }}>{title}</div>
      {children && <div className="small muted" style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}

/** Page title block. `loud` adds the slanted headline with a scribble. */
export function Head({ title, lead, highlight, loud = false, children }) {
  return (
    <div className="head">
      <div>
        {loud ? (
          <>
            <h1 className="slant">{title}{highlight && <> <span className="hl">{highlight}</span></>}</h1>
            <Scribble />
          </>
        ) : (
          <h1>{title}</h1>
        )}
        {lead && <p>{lead}</p>}
      </div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  );
}

export function StateSticker({ state, tilt = false }) {
  return <span className={`sticker s-${state} ${tilt ? 'tilt' : ''}`}>{TICKET_STATES[state] ?? state}</span>;
}

/** Keeps ticking from the server's "now" (which includes the demo clock). */
export function useServerClock(serverNow) {
  const anchor = useRef({ server: serverNow, local: Date.now() });
  const [, tick] = useState(0);
  useEffect(() => {
    anchor.current = { server: serverNow, local: Date.now() };
  }, [serverNow]);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return serverNow ? anchor.current.server + (Date.now() - anchor.current.local) : Date.now();
}

export function span(ms) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

export function Countdown({ to, serverNow }) {
  const now = useServerClock(serverNow);
  return <span className="nowrap">{span(to - now)}</span>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal fade-in" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h3 className="card-title">{title}</h3>
          <button className="btn sm plain" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A drawer that slides up from the bottom on phones (centred card on wide screens).
 *  It is drawn at the top level of the page, so it sits above the tab bar even when opened from the top bar.
 *  Drag the handle up to open it fully, down to shrink it, and down again to close. Tap the handle to toggle. */
export function Sheet({ title, onClose, children }) {
  const [full, setFull] = useState(false);
  const [drag, setDrag] = useState(0);
  const from = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const down = (e) => { from.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (from.current !== null) setDrag(e.clientY - from.current); };
  const up = () => {
    if (from.current === null) return;
    if (Math.abs(drag) < 6) setFull((f) => !f);
    else if (drag < -40) setFull(true);
    else if (drag > 90) (full ? setFull(false) : onClose());
    else if (drag > 40 && full) setFull(false);
    from.current = null;
    setDrag(0);
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="overlay sheet-wrap" onClick={onClose}>
      <div className={`sheet ${full ? 'full' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={drag > 0 ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}>
        <div className="sheet-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="sheet-grip" aria-hidden="true" />
          <div className="row between" style={{ marginBottom: 12 }}>
            <h3 className="card-title">{title}</h3>
            <button className="btn sm plain" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** "Are you sure?" box: the action only runs when the person taps the main button. */
export function Confirm({ title, children, yes = 'Yes', verb = 'Working', busy = false, onYes, onClose, no = 'Cancel' }) {
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <div className="small" style={{ marginBottom: 16 }}>{children}</div>
      <div className="row wrap">
        <button type="button" className="btn go" onClick={onYes} disabled={busy}><Busy on={busy} verb={verb}>{yes}</Busy></button>
        <button type="button" className="btn" onClick={onClose} disabled={busy}>{no}</button>
      </div>
    </Modal>
  );
}

export function Toasts() {
  const list = useSelector((s) => s.toasts);
  const dispatch = useDispatch();
  useEffect(() => {
    if (!list.length) return;
    const t = setTimeout(() => dispatch(dismiss(list[0].id)), 3500);
    return () => clearTimeout(t);
  }, [list, dispatch]);
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => <div key={t.id} className={`toast fade-in ${t.tone === 'bad' ? 'bad' : ''}`}>{t.text}</div>)}
    </div>
  );
}

export const prettyDay = (day, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

/** The standard Indian food mark: green square + dot for veg, red square + triangle for non-veg. */
export function DietMark({ diet, size = 16 }) {
  const veg = diet === 'veg';
  const c = veg ? '#1F8A3B' : '#C62E2E';
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={veg ? 'Veg' : 'Non-veg'} style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="14" height="14" rx="1.5" fill="#fff" stroke={c} strokeWidth="1.8" />
      {veg ? <circle cx="8" cy="8" r="3.6" fill={c} /> : <path d="M8 3.8 12.2 11.6H3.8Z" fill={c} />}
    </svg>
  );
}

/** An ISO timestamp as an IST date and time, e.g. "Tue, 10 Nov, 4:33 am". */
export const istStamp = (iso) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const istDay = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
