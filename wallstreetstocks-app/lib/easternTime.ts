// lib/easternTime.ts
// Correct US Eastern DST test. US DST runs from the 2nd Sunday of March to the
// 1st Sunday of November. The app previously used month-only approximations
// (e.g. "March–November = EDT"), which are wrong for the first ~1.5 weeks of
// March and most of November — making the market-status badge and 1D chart
// timestamps off by an hour for ~4 weeks a year.
export function isEasternDST(d: Date): boolean {
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const day = d.getDate();

  if (month < 2 || month > 10) return false; // Jan, Feb, Dec → EST
  if (month > 2 && month < 10) return true;   // Apr–Oct → EDT

  if (month === 2) {
    // March: DST begins on the 2nd Sunday
    const firstSunday = 1 + ((7 - new Date(year, 2, 1).getDay()) % 7);
    return day >= firstSunday + 7;
  }
  // November: DST ends on the 1st Sunday
  const firstSunday = 1 + ((7 - new Date(year, 10, 1).getDay()) % 7);
  return day < firstSunday;
}
