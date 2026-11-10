'use client';
import { DietMark } from './kit';

/** A meal's full menu: shared dishes, then the veg and non-veg dishes with their marks. Always shows everything. */
export default function Dishes({ dish, compact = false }) {
  if (!dish) return null;
  const pick = (diet, text) => (
    <span className="pick">
      <DietMark diet={diet} size={compact ? 12 : 13} /> {text}
    </span>
  );
  return (
    <span className={`dishes ${compact ? 'compact' : ''}`}>
      <span className="common">{dish.common}</span>
      {(dish.veg || dish.nonveg) && (
        <span className="picks">
          {dish.veg && pick('veg', dish.veg)}
          {dish.nonveg && pick('nonveg', dish.nonveg)}
        </span>
      )}
    </span>
  );
}
