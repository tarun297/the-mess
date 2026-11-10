// Every mess rule runs on India Standard Time and on the SERVER's clock.
// IST is UTC+05:30 all year, so a fixed shift is enough.
import { MEAL_SLOTS } from './catalog.js';

const IST_SHIFT = 5.5 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/** Split a timestamp into IST calendar parts. */
export function inIST(ms) {
  const shifted = new Date(ms + IST_SHIFT);
  const sunFirst = shifted.getUTCDay();
  return {
    day: shifted.toISOString().slice(0, 10), // YYYY-MM-DD
    weekday: (sunFirst + 6) % 7, // 0 = Monday ... 6 = Sunday
    clock: shifted.toISOString().slice(11, 16), // HH:MM
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** Timestamp of a wall-clock time in IST. */
export const fromIST = (day, hhmm = '00:00') => Date.parse(`${day}T${hhmm}:00+05:30`);

export const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export const shiftDay = (day, by) => new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY).toISOString().slice(0, 10);

/** The Monday that starts the week containing `day`. */
export const weekOf = (day) => shiftDay(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

export const sevenDays = (monday) => [0, 1, 2, 3, 4, 5, 6].map((i) => shiftDay(monday, i));

/** Meal being served at `ms`, or null. */
export function servingAt(ms) {
  const { minutes } = inIST(ms);
  return MEAL_SLOTS.find((m) => minutes >= minutesOf(m.opens) && minutes < minutesOf(m.closes)) ?? null;
}

/** The next meal to open after `ms`, with the day it is on. */
export function upcomingAfter(ms) {
  const now = inIST(ms);
  const later = MEAL_SLOTS.find((m) => minutesOf(m.opens) > now.minutes);
  const day = later ? now.day : shiftDay(now.day, 1);
  const meal = later ?? MEAL_SLOTS[0];
  return { ...meal, day, at: fromIST(day, meal.opens) };
}

/** Meal closest to `ms` today (used when the demo allows check-in outside meal hours). */
export function closestMeal(ms) {
  const { minutes } = inIST(ms);
  const gap = (m) => Math.min(Math.abs(minutes - minutesOf(m.opens)), Math.abs(minutes - minutesOf(m.closes)));
  return MEAL_SLOTS.reduce((best, m) => (gap(m) < gap(best) ? m : best));
}

export const hasStarted = (day, mealId, ms) => fromIST(day, MEAL_SLOTS.find((m) => m.id === mealId).opens) <= ms;
export const hasEnded = (day, mealId, ms) => fromIST(day, MEAL_SLOTS.find((m) => m.id === mealId).closes) < ms;
