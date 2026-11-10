// The coupon planner's basket: which meals are picked for the week on sale,
// each as 'veg' or 'nonveg'. It lives in Redux so it survives going to review and back.
import { createSlice, createSelector } from '@reduxjs/toolkit';

const ORDER = ['breakfast', 'lunch', 'dinner'];
const keyOf = (day, meal) => `${day}|${meal}`;

const basketSlice = createSlice({
  name: 'basket',
  initialState: { week: null, picked: {}, focusDay: 0 },
  reducers: {
    setWeek(state, { payload }) {
      if (state.week !== payload) {
        state.week = payload;
        state.picked = {};
        state.focusDay = 0;
      }
    },
    focus(state, { payload }) {
      state.focusDay = payload;
    },
    /** Tap a meal: add it as veg, or remove it if already picked. */
    toggle(state, { payload: { day, meal } }) {
      const k = keyOf(day, meal);
      if (state.picked[k]) delete state.picked[k];
      else state.picked[k] = 'veg';
    },
    setDiet(state, { payload: { day, meal, diet } }) {
      state.picked[keyOf(day, meal)] = diet;
    },
    /** Shortcuts. Keeps a slot's veg/non-veg choice if it was already picked. */
    fill(state, { payload: { preset, days, blocked = [], previous = [], nonvegKeys = [] } }) {
      const next = {};
      const put = (day, meal, diet) => {
        const k = keyOf(day, meal);
        const want = diet ?? state.picked[k] ?? 'veg';
        if (!blocked.includes(k)) next[k] = want === 'nonveg' && !nonvegKeys.includes(k) ? 'veg' : want;
      };
      if (preset === 'all') days.forEach((d) => ORDER.forEach((m) => put(d, m)));
      if (preset === 'lunchDinner') days.forEach((d) => { put(d, 'lunch'); put(d, 'dinner'); });
      if (preset === 'weekdays') days.slice(0, 5).forEach((d) => ORDER.forEach((m) => put(d, m)));
      if (preset === 'lastWeek') previous.forEach((p) => put(p.day, p.meal, p.diet));
      state.picked = next;
    },
    /** Make every picked meal veg or non-veg in one go. */
    allDiet(state, { payload: { diet, nonvegKeys = [] } }) {
      Object.keys(state.picked).forEach((k) => {
        state.picked[k] = diet === 'nonveg' && !nonvegKeys.includes(k) ? 'veg' : diet;
      });
    },
    empty(state) {
      state.picked = {};
    },
  },
});

export const { setWeek, focus, toggle, setDiet, fill, allDiet, empty } = basketSlice.actions;
export const selectPicked = (s) => s.basket.picked;
export const selectFocusDay = (s) => s.basket.focusDay;

/** The basket as [{day, meal, diet}], sorted by day then meal. */
export const selectPicks = createSelector(selectPicked, (picked) =>
  Object.entries(picked)
    .map(([k, diet]) => ({ day: k.split('|')[0], meal: k.split('|')[1], diet }))
    .sort((a, b) => a.day.localeCompare(b.day) || ORDER.indexOf(a.meal) - ORDER.indexOf(b.meal)),
);

export default basketSlice.reducer;
