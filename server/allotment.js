// A student's mess is worked out from their year, plan and gender. Nobody picks it by hand.
//
//   Year 1               -> First-Year Mess (boys and girls together)
//   Year 2               -> Main Mess (boys / girls)
//   Year 3-4, fixed plan  -> Main Mess (boys / girls)
//   Year 3-4, coupon plan -> Coupon Mess (boys / girls)

/** 1st and 2nd years are always on the fixed plan. */
export const allowedPlan = (year, wanted) => (year >= 3 && wanted === 'coupon' ? 'coupon' : 'fixed');

export function allotMess({ year, plan, gender }) {
  if (year === 1) return 'FY';
  const side = gender === 'F' ? 'G' : 'B';
  return allowedPlan(year, plan) === 'coupon' ? `CPN-${side}` : `MAIN-${side}`;
}
