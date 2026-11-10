'use client';
// The frame around every signed-in screen: side rail on desktop, top bar + tab bar on phones.
// Students get the loud look; staff, society and admin get the subtle-bold look.
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { messApi, useSessionQuery, useSignOutMutation } from '@/store/api';
import { signedOut } from '@/store/accountSlice';
import { ROLES } from '@/server/catalog';
import { Logo, Loader, Grain, Icon, Modal, Busy } from './kit';
import NotificationBell from './NotificationBell';

function linksFor(a) {
  if (a.role === 'student') {
    const list = [
      { href: '/home', label: 'Home', icon: 'home' },
      { href: '/menu', label: 'Menu', icon: 'menu' },
    ];
    if (a.plan === 'coupon') {
      list.push({ href: '/passes', label: 'Plan coupons', short: 'Plan', icon: 'plan' });
      list.push({ href: '/passes/wallet', label: 'My coupons', short: 'Wallet', icon: 'wallet' });
      list.push({ href: '/bhandar', label: 'Coupon Bhandar', short: 'Bhandar', icon: 'swap' });
    }
    list.push({ href: '/feedback', label: 'Feedback', icon: 'talk' });
    return list;
  }
  if (a.role === 'staff') {
    return [
      { href: '/staff/screen', label: 'Entrance screen', short: 'Screen', icon: 'screen' },
      { href: '/staff/counter', label: 'Counter check-in', short: 'Counter', icon: 'keypad' },
      { href: '/staff/kitchen', label: 'Cook for', icon: 'pot' },
      { href: '/staff/menu', label: 'Edit menu', short: 'Menu', icon: 'pencil' },
      { href: '/feedback', label: 'Feedback', icon: 'talk' },
    ];
  }
  if (a.role === 'society') {
    return [
      { href: '/society', label: 'Dashboard', icon: 'board' },
      { href: '/society/inspect', label: 'Inspections', short: 'Inspect', icon: 'shield' },
      { href: '/feedback', label: 'Feedback', icon: 'talk' },
      { href: '/menu', label: 'Menus', icon: 'menu' },
    ];
  }
  return [
    { href: '/admin/students', label: 'Students', icon: 'people' },
    { href: '/admin/rules', label: 'Coupon rules', short: 'Rules', icon: 'rules' },
    { href: '/admin/clock', label: 'Demo clock', short: 'Clock', icon: 'clock' },
    { href: '/feedback', label: 'Feedback', icon: 'talk' },
    { href: '/menu', label: 'Menus', icon: 'menu' },
  ];
}

/** Phone tab bar: at most 5 tabs. Coupon students get one "Coupons" tab for planner + wallet. */
function tabsFor(a, links) {
  if (a.role === 'student' && a.plan === 'coupon') {
    return [
      links[0], links[1],
      { href: '/passes', label: 'Coupons', icon: 'wallet', also: ['/passes/wallet', '/passes/review'] },
      ...links.filter((l) => l.href === '/bhandar' || l.href === '/feedback'),
    ];
  }
  return links.slice(0, 5);
}

const initials = (name) => name.split(/[^A-Za-z]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function Shell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { data, isLoading, error } = useSessionQuery();
  const [signOut, { isLoading: leaving }] = useSignOutMutation();
  const [askLeave, setAskLeave] = useState(false);

  if (isLoading) return <Loader full />;
  if (error || !data) {
    if (typeof window !== 'undefined') router.replace('/login');
    return <Loader full />;
  }
  const me = data.account;
  const tier = ROLES[me.role].tier;
  const links = linksFor(me);
  const here = (href) => path === href || (path.startsWith(`${href}/`) && !links.some((l) => l.href !== href && path.startsWith(l.href) && l.href.length > href.length));

  const leave = async () => {
    await signOut();
    dispatch(signedOut());
    dispatch(messApi.util.resetApiState());
    router.replace('/login');
  };
  const meta = me.role === 'student' ? `${me.roll} · ${me.plan === 'coupon' ? 'Coupon' : 'Fixed'} plan` : me.role === 'staff' ? me.messTitle : ROLES[me.role].label;

  return (
    <div className={`shell ${tier}`}>
      {tier === 'loud' && <Grain />}
      <aside className="rail">
        <Link href="/" className="rail-logo" aria-label="THE MESS. home"><Logo size={tier === 'loud' ? 30 : 24} /></Link>
        {tier === 'subtle' && <div className="rail-role">{ROLES[me.role].label}</div>}
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`navlink ${here(l.href) ? 'on' : ''}`} aria-current={here(l.href) ? 'page' : undefined}>
            <Icon name={l.icon} size={19} /> {l.label}
          </Link>
        ))}
        <div className="rail-foot">
          {tier === 'loud' && <div className="checker" aria-hidden="true" />}
          <div className="me">
            <div className="avatar">{initials(me.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="me-name">{me.name}</div>
              <div className="me-meta">{meta}</div>
            </div>
          </div>
          {me.role === 'student' && me.plan === 'coupon' && <div className="rail-bell"><NotificationBell /> <span className="small bold">Alerts</span></div>}
          <button className="btn sm" onClick={() => setAskLeave(true)}><Icon name="out" size={17} /> Log out</button>
        </div>
      </aside>

      <header className="topbar">
        <Link href="/" aria-label="THE MESS. home"><Logo size={20} /></Link>
        <div className="row" style={{ gap: 8 }}>
          {me.role === 'student' && me.plan === 'coupon' && <NotificationBell />}
          <button className="btn sm" onClick={() => setAskLeave(true)} aria-label="Log out"><Icon name="out" size={17} /></button>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          {data.demoClock && (
            <div className="demo-flag">
              <Icon name="clock" size={17} /> Demo clock on: pretend date and time.
              {me.role === 'admin' && <Link href="/admin/clock">Change it</Link>}
            </div>
          )}
          {children}
        </div>
      </main>

      {askLeave && (
        <Modal title="Log out of your account?" onClose={() => !leaving && setAskLeave(false)}>
          <p className="small" style={{ marginBottom: 16 }}>You&apos;ll need your email or roll number and password to get back in.</p>
          <div className="row wrap">
            <button className="btn go" onClick={leave} disabled={leaving}><Busy on={leaving} verb="Logging out">Log out</Busy></button>
            <button className="btn" onClick={() => setAskLeave(false)} disabled={leaving}>Stay logged in</button>
          </div>
        </Modal>
      )}

      <nav className="tabbar" aria-label="Main">
        {tabsFor(me, links).map((l) => (
          <Link key={l.href} href={l.href} className={here(l.href) || l.also?.some((p) => path.startsWith(p)) ? 'on' : ''}>
            <span className="ic"><Icon name={l.icon} size={18} /></span>
            {l.short || l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
