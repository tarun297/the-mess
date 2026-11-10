// Fixed facts about the IIIT-BH messes. Shared by the API and the pages.

export const MEAL_SLOTS = [
  { id: 'breakfast', name: 'Breakfast', opens: '07:00', closes: '09:00' },
  { id: 'lunch', name: 'Lunch', opens: '12:00', closes: '14:00' },
  { id: 'dinner', name: 'Dinner', opens: '19:00', closes: '21:00' },
];
export const MEAL_IDS = MEAL_SLOTS.map((m) => m.id);
export const mealName = (id) => MEAL_SLOTS.find((m) => m.id === id)?.name ?? id;
export const mealSlot = (id) => MEAL_SLOTS.find((m) => m.id === id);

export const DIETS = { veg: 'Veg', nonveg: 'Non-veg' };

/** Can you get this meal non-veg? Only when the menu has a non-veg pick. */
export const hasNonveg = (dish) => Boolean(dish?.nonveg);

/** The plate one student gets: shared dishes plus their veg or non-veg pick. */
export const plateFor = (dish, diet) => {
  if (!dish) return '';
  const pick = diet === 'nonveg' && dish.nonveg ? dish.nonveg : dish.veg;
  if (!pick) return dish.common;
  return `${pick} + ${dish.common.charAt(0).toLowerCase()}${dish.common.slice(1)}`;
};

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Starting values for the coupon rules. The admin can change them later (stored in `config`).
export const STARTING_RULES = {
  prices: { breakfast: 20, lunch: 55, dinner: 44 },
  minDays: 4,
  escalateAfterHours: 48,
};

export const MESSES = [
  { id: 'FY', title: 'First-Year Mess', tag: 'First-year', plan: 'fixed' },
  { id: 'MAIN-B', title: 'Main Mess · Boys', tag: 'Main · Boys', plan: 'fixed' },
  { id: 'MAIN-G', title: 'Main Mess · Girls', tag: 'Main · Girls', plan: 'fixed' },
  { id: 'CPN-B', title: 'Coupon Mess · Boys', tag: 'Coupon · Boys', plan: 'coupon' },
  { id: 'CPN-G', title: 'Coupon Mess · Girls', tag: 'Coupon · Girls', plan: 'coupon' },
];
export const messTitle = (id) => MESSES.find((m) => m.id === id)?.title ?? id;

// Menus and inspections are shown by group, not by mess: boys and girls always eat the same menu.
// (First-Year = Menu A; Main and Coupon both use Menu B. `mess` is the mess id a group is stored under,
// `ids` are all the messes in the group.)
export const MENU_GROUPS = [
  { id: 'FY', label: 'First-year', title: 'First-Year Mess', mess: 'FY', ids: ['FY'] },
  { id: 'MAIN', label: 'Main', title: 'Main Mess · boys and girls', mess: 'MAIN-B', ids: ['MAIN-B', 'MAIN-G'] },
  { id: 'CPN', label: 'Coupon', title: 'Coupon Mess · boys and girls', mess: 'CPN-B', ids: ['CPN-B', 'CPN-G'] },
];
export const menuGroupOf = (messId) => MENU_GROUPS.find((g) => g.id === (messId === 'FY' ? 'FY' : String(messId).startsWith('MAIN') ? 'MAIN' : 'CPN'));

export const ROLES = {
  student: { label: 'Student', home: '/home', tier: 'loud' },
  staff: { label: 'Mess staff', home: '/staff/screen', tier: 'subtle' },
  society: { label: 'Mess society', home: '/society', tier: 'subtle' },
  admin: { label: 'Admin', home: '/admin/students', tier: 'subtle' },
};

export const TICKET_TOPICS = [
  { id: 'quality', name: 'Food quality' },
  { id: 'hygiene', name: 'Hygiene & cleanliness' },
  { id: 'quantity', name: 'Quantity' },
  { id: 'staff', name: 'Staff behaviour' },
  { id: 'suggestion', name: 'Menu suggestion' },
  { id: 'other', name: 'Other' },
];
// Stored status -> what people see.
export const TICKET_STATES = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

export const INSPECTION_ITEMS = [
  { id: 'kitchen', name: 'Kitchen cleanliness', hint: 'Floors, stoves, drains' },
  { id: 'storage', name: 'Food storage', hint: 'Covered, dated, off the floor' },
  { id: 'water', name: 'Drinking water', hint: 'RO working, coolers clean' },
  { id: 'staff', name: 'Staff hygiene', hint: 'Caps, gloves, aprons' },
  { id: 'serving', name: 'Serving area', hint: 'Counters, plates, cutlery' },
  { id: 'taste', name: 'Taste', hint: 'Sample every dish served' },
];
export const inspectionVerdict = (total) => (total >= 24 ? 'Good' : total >= 18 ? 'OK' : 'Poor');
