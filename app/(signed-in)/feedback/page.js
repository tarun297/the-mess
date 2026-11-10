'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTicketsQuery, useRaiseTicketMutation, useMoveTicketMutation, useVoteTicketMutation, useRatingSummaryQuery, problemText } from '@/store/api';
import { selectAccount } from '@/store/accountSlice';
import { say } from '@/store/toastSlice';
import { MEAL_SLOTS, MESSES, mealName, TICKET_STATES } from '@/server/catalog';
import { Head, Loader, Problem, Empty, Icon, StateSticker, Countdown, prettyDay, istStamp, Busy } from '@/components/kit';

const when = (iso) => istStamp(iso);
const STEPS = ['open', 'acknowledged', 'resolved'];

function Timeline({ t, serverNow }) {
  const reached = (s) => t.log.some((l) => l.state === s);
  return (
    <ol className="steps">
      {STEPS.map((s) => <li key={s} className={reached(s) || t.state === s ? 'done' : ''}>{TICKET_STATES[s]}</li>)}
      <li className={t.state === 'escalated' ? 'done esc' : 'later'}>
        {t.state === 'escalated' ? 'Escalated' : t.dueAt ? <>Escalates in <Countdown to={t.dueAt} serverNow={serverNow} /></> : 'Escalated'}
      </li>
    </ol>
  );
}

function TicketCard({ t, me, serverNow, topicName }) {
  const [move, { isLoading, error }] = useMoveTicketMutation();
  const [vote] = useVoteTicketMutation();
  const [action, setAction] = useState(null); // { state, label }
  const [note, setNote] = useState('');
  const dispatch = useDispatch();
  const loud = me.role === 'student';

  const options = {
    staff: { open: [['acknowledged', 'Reply and acknowledge'], ['resolved', 'Mark resolved']], acknowledged: [['resolved', 'Mark resolved']] },
    society: { open: [['escalated', 'Escalate to contractor']], acknowledged: [['escalated', 'Escalate to contractor']], resolved: [['escalated', 'Escalate again']], escalated: [['resolved', 'Mark resolved']] },
    student: t.canReopen ? { resolved: [['open', 'Not fixed? Reopen']] } : {},
    admin: {},
  }[me.role][t.state] ?? [];

  const send = async () => {
    const res = await move({ id: t.id, state: action.state, remark: note });
    if (res.data) {
      dispatch(say(`Ticket #${t.id}: ${TICKET_STATES[action.state].toLowerCase()}.`));
      setAction(null);
      setNote('');
    }
  };

  return (
    <article className={`card ${loud ? 'lift' : ''} stack`} style={{ gap: 12 }}>
      <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <b className="sub" style={{ fontSize: 17 }}>{topicName(t.topic)}{t.meal ? ` · ${mealName(t.meal)}` : ''}</b>
          <div className="small muted">
            #{t.id} · {t.author}{t.authorRoll ? ` (${t.authorRoll})` : ''}{t.anonymous && !loud ? ' · posted anonymously' : ''} · {when(t.openedAt)}{me.role !== 'student' && me.role !== 'staff' ? ` · ${t.messTitle}` : ''}
          </div>
        </div>
        <StateSticker state={t.state} tilt={loud} />
      </div>
      <p style={{ fontSize: 15 }}>{t.body}</p>
      <Timeline t={t} serverNow={serverNow} />
      {t.log.filter((l) => l.remark && l.remark !== 'Raised').map((l, i) => (
        <div key={i} className={`reply ${l.automatic ? 'auto' : ''}`}>
          <b>{l.by}:</b> {l.remark} <span className="tiny muted">· {when(l.at)}</span>
        </div>
      ))}
      <div className="row wrap" style={{ gap: 8 }}>
        {me.role === 'student' && !t.mine && (
          <button className={`btn sm ${t.myVote ? 'lime' : ''}`} onClick={() => vote(t.id)} aria-pressed={t.myVote}>
            <Icon name="thumb" size={16} /> Me too · {t.votes}
          </button>
        )}
        {(me.role !== 'student' || t.mine) && t.votes > 0 && <span className="sticker">{t.votes} others had this too</span>}
        {!action && options.map(([state, label]) => (
          <button key={state} className={`btn sm ${state === 'resolved' || state === 'open' ? '' : 'go'}`} onClick={() => setAction({ state, label })}>{label}</button>
        ))}
      </div>
      {action && (
        <div className="stack" style={{ gap: 8 }}>
          <label className="field">
            {me.role === 'staff' ? 'Reply to the student' : me.role === 'student' ? "What's still wrong?" : 'Note (optional)'}
            <textarea className="textarea" style={{ minHeight: 80 }} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} autoFocus />
          </label>
          {error && <Problem>{problemText(error)}</Problem>}
          <div className="row">
            <button className="btn go sm" onClick={send} disabled={isLoading}><Busy on={isLoading} verb="Sending">{action.label}</Busy></button>
            <button className="btn sm plain" onClick={() => { setAction(null); setNote(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </article>
  );
}

function RaiseForm({ topics, topic, setTopic }) {
  const [meal, setMeal] = useState('');
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [raise, { isLoading, error }] = useRaiseTicketMutation();
  const dispatch = useDispatch();
  const send = async (e) => {
    e.preventDefault();
    const res = await raise({ topic, meal: meal || undefined, body, anonymous });
    if (res.data) {
      dispatch(say('Sent. The mess team will reply here.'));
      setBody('');
      setMeal('');
      setAnonymous(false);
    }
  };
  return (
    <form className="card lift stack" onSubmit={send}>
      <h2 className="card-title">{topics.find((t) => t.id === topic)?.name}</h2>
      <label className="field">
        Which meal
        <select className="select" value={meal} onChange={(e) => setMeal(e.target.value)}>
          <option value="">Not about one meal</option>
          {MEAL_SLOTS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="field">
        Tell us what happened
        <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} placeholder="Found a hair in the dal at counter 2." />
      </label>
      <label className="tick"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Hide my name from other students (the mess team still sees it)</label>
      {error && <Problem>{problemText(error)}</Problem>}
      <button className="btn go lg" disabled={isLoading || body.trim().length < 10}><Busy on={isLoading} verb="Sending">Send feedback →</Busy></button>
    </form>
  );
}

function Stars({ value }) {
  return (
    <span className="row" style={{ gap: 2 }} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={16} width={1.8} stroke="#121212" fill={n <= Math.round(value) ? '#D5E07C' : 'none'} />)}
    </span>
  );
}

function RatingsPanel({ mess }) {
  const { data } = useRatingSummaryQuery(mess || undefined);
  if (!data) return null;
  return (
    <section className="card stack" style={{ gap: 10 }}>
      <h2 className="card-title">Meal ratings this week</h2>
      {MEAL_SLOTS.map((m) => {
        const r = data.meals[m.id];
        return (
          <div key={m.id} className="row between">
            <span className="bold">{m.name}</span>
            {r ? <span className="row" style={{ gap: 8 }}><Stars value={r.avg} /> <b>{r.avg.toFixed(1)}</b> <span className="tiny muted">({r.n})</span></span> : <span className="small muted">No ratings yet</span>}
          </div>
        );
      })}
      {data.notes.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 6 }}>Latest comments</div>
          {data.notes.map((n, i) => <div key={i} className="small">“{n.remark}” <span className="tiny muted">· {mealName(n.meal)}, {prettyDay(n.day)} · {n.stars}★</span></div>)}
        </>
      )}
    </section>
  );
}

export default function Feedback() {
  const me = useSelector(selectAccount);
  const { data, isLoading, error } = useTicketsQuery(undefined, { pollingInterval: 30_000 });
  const [topic, setTopic] = useState('quality');
  const [filter, setFilter] = useState('active');
  const [mess, setMess] = useState('');
  if (isLoading || !me) return <Loader />;
  if (error) return <Problem error={error} />;

  const topicName = (id) => data.topics.find((t) => t.id === id)?.name ?? id;
  const loud = me.role === 'student';
  let list = data.tickets;
  if (mess) list = list.filter((t) => t.mess === mess);
  if (filter === 'active') list = list.filter((t) => t.state !== 'resolved');
  if (filter === 'mine') list = list.filter((t) => t.mine);
  if (['open', 'acknowledged', 'escalated', 'resolved'].includes(filter)) list = list.filter((t) => t.state === filter);
  const filters = loud
    ? [['active', 'Not fixed yet'], ['mine', 'Mine'], ['all', 'Everything']]
    : [['active', 'Needs action'], ['escalated', 'Escalated'], ['open', 'Open'], ['acknowledged', 'Acknowledged'], ['resolved', 'Resolved'], ['all', 'All']];

  const listBlock = (
    <section className="stack" style={{ gap: 14 }}>
      <div className="row between wrap">
        <h2 className={loud ? 'display' : 'card-title'} style={{ fontSize: loud ? 24 : 18 }}>{loud ? `Feedback at your mess` : 'Tickets'}</h2>
        <div className="segs">{filters.map(([id, label]) => <button key={id} className={`seg ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{label}</button>)}</div>
      </div>
      {!loud && me.role !== 'staff' && (
        <div className="segs">
          <button className={`seg ${!mess ? 'on' : ''}`} onClick={() => setMess('')}>All messes</button>
          {MESSES.map((m) => <button key={m.id} className={`seg ${mess === m.id ? 'on' : ''}`} onClick={() => setMess(m.id)}>{m.tag}</button>)}
        </div>
      )}
      <p className="small muted">Anything still open {data.escalateAfterHours} hours after it&apos;s raised goes to the mess society automatically.</p>
      {list.length === 0 ? <Empty title="Nothing here" art="food-samosa">{filter === 'active' ? 'Every ticket here is resolved.' : 'No tickets match this filter.'}</Empty>
        : list.map((t) => <TicketCard key={t.id} t={t} me={me} serverNow={data.serverNow} topicName={topicName} />)}
    </section>
  );

  if (!loud) {
    const counts = (s) => data.tickets.filter((t) => t.state === s && (!mess || t.mess === mess)).length;
    return (
      <>
        <Head title="Feedback" lead={me.role === 'staff' ? `Tickets from students at your mess. Reply within ${data.escalateAfterHours} hours or they go to the mess society.` : 'Every ticket across the messes, oldest problems first.'} />
        <div className="tiles-sm stats" style={{ marginBottom: 22 }}>
          <div className="card lift tone-violet"><div className="stat-label" style={{ color: '#fff' }}>Escalated</div><div className="stat">{counts('escalated')}</div></div>
          <div className="card lift"><div className="stat-label">Open</div><div className="stat">{counts('open')}</div></div>
          <div className="card lift"><div className="stat-label">Acknowledged</div><div className="stat">{counts('acknowledged')}</div></div>
          <div className="card lift"><div className="stat-label">Resolved</div><div className="stat">{counts('resolved')}</div></div>
        </div>
        <div className="split">
          <div className="main-col">{listBlock}</div>
          <aside className="side-col"><RatingsPanel mess={me.role === 'staff' ? null : mess} /></aside>
        </div>
      </>
    );
  }

  return (
    <div className="stack" style={{ gap: 28 }}>
      <section className="fb-hero">
        <div className="fb-left">
          <h1 className="slant display" style={{ fontSize: 'clamp(40px, 6vw, 60px)', lineHeight: 0.92 }}>THE MESS<br /><span className="hl">FEEDBACK.</span></h1>
          <p style={{ fontSize: 17, maxWidth: 420 }}>Tell the mess what worked, what didn&apos;t, and what could be better.<span className="hide-phone"> Staff reply first; if it isn&apos;t fixed in {data.escalateAfterHours} hours it goes to the mess society.</span></p>
        </div>
        <div className="fb-right">
          <div className="eyebrow">What&apos;s it about?</div>
          {data.topics.map((t) => (
            <button key={t.id} className={`fb-topic ${topic === t.id ? 'on' : ''}`} onClick={() => setTopic(t.id)} aria-pressed={topic === t.id}>
              <span>{t.name}</span><Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
      </section>
      <div className="split">
        <div className="side-col" style={{ flex: '1 1 360px' }}><RaiseForm topics={data.topics} topic={topic} setTopic={setTopic} /></div>
        <div className="main-col">{listBlock}</div>
      </div>
    </div>
  );
}
