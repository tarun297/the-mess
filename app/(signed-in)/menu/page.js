'use client';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useMenuQuery } from '@/store/api';
import { selectAccount } from '@/store/accountSlice';
import { MEAL_SLOTS, WEEKDAYS, MENU_GROUPS, menuGroupOf } from '@/server/catalog';
import { Head, Loader, Problem, Art } from '@/components/kit';
import Dishes from '@/components/Dishes';

export default function MenuPage() {
  const me = useSelector(selectAccount);
  const [pick, setPick] = useState(null);
  const { data, isLoading, error } = useMenuQuery(pick);
  if (isLoading || !me) return <Loader />;
  if (error) return <Problem error={error} />;
  const loud = me.role === 'student';
  const group = menuGroupOf(data.mess);

  return (
    <>
      <Head loud={loud} title={loud ? "THIS WEEK'S" : 'Menus'} highlight={loud ? 'MENU.' : undefined}
        lead={`${group.title}. The menu repeats every week; mess staff can change it.`}>
        {!loud && null}
      </Head>
      {data.canPick && (
        <div className="segs" style={{ marginBottom: 18 }}>
          {MENU_GROUPS.map((g) => <button key={g.id} className={`seg ${group.id === g.id ? 'on' : ''}`} onClick={() => setPick(g.mess)}>{g.label}</button>)}
        </div>
      )}
      {(() => {
        const t = data.todayIndex;
        const upcoming = [...Array(7).keys()].filter((d) => d >= t);
        const past = [...Array(7).keys()].filter((d) => d < t);
        const card = (d) => (
          <section key={d} className={`card ${loud ? 'lift' : ''} ${d === t ? 'is-today' : ''} ${d < t ? 'is-past' : ''}`}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <h2 className="card-title">{WEEKDAYS[d]}</h2>
              {d === t && <span className="sticker tilt s-resolved">Today</span>}
              {d === t + 1 && <span className="sticker">Tomorrow</span>}
            </div>
            <div className="stack" style={{ gap: 12 }}>
              {MEAL_SLOTS.map((m) => (
                <div key={m.id} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <Art name={`meal-${m.id}`} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <b className="sub">{m.name}</b> <span className="tiny muted">{m.opens}–{m.closes}</span>
                    <Dishes dish={data.week[d][m.id]} compact />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
        return (
          <>
            <div className="week-menu">{upcoming.map(card)}</div>
            {past.length > 0 && (
              <>
                <h2 className={loud ? 'display' : 'card-title'} style={{ fontSize: loud ? 24 : 18, margin: '32px 0 14px' }}>Earlier this week</h2>
                <div className="week-menu">{past.map(card)}</div>
              </>
            )}
          </>
        );
      })()}
    </>
  );
}
