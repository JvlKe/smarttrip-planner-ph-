/**
 * tripDates.js
 *
 * Calculates the inclusive sequence of UTC calendar dates for a trip.
 * Using UTC methods is essential: the database stores dates without a time
 * component, so local-time methods can shift a boundary date into the wrong
 * calendar day on servers that are not in UTC.
 */

export const MAX_TRIP_DAYS = 30;

/**
 * Returns an array of Date objects, one for each calendar day from startDate
 * through endDate inclusive, anchored at UTC midnight (00:00:00.000Z).
 *
 * Throws a RangeError when:
 *   - either argument is not a valid Date
 *
 * Returns an empty array if endDate is before startDate.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Date[]}
 */
export function tripDates(startDate, endDate) {
  if (!(startDate instanceof Date) || isNaN(startDate.getTime()))
    throw new RangeError("startDate must be a valid Date");
  if (!(endDate instanceof Date) || isNaN(endDate.getTime()))
    throw new RangeError("endDate must be a valid Date");

  // Normalise both to UTC midnight so subtraction gives exact whole-day counts
  // regardless of any time-of-day component stored in the database value.
  const startUTC = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const endUTC = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  );

  if (endUTC < startUTC) return [];

  const MS_PER_DAY = 86_400_000;
  const count = Math.round((endUTC - startUTC) / MS_PER_DAY) + 1;

  return Array.from({ length: count }, (_, i) => new Date(startUTC + i * MS_PER_DAY));
}

/**
 * Returns the number of calendar days in a trip (inclusive), without
 * allocating the full date array. Useful for a quick count where only the
 * length matters. Applies the same UTC normalisation as tripDates().
 *
 * Returns 0 for invalid or reversed inputs instead of throwing, so callers
 * that only need the length for display purposes get a safe fallback.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
export function tripDayCount(startDate, endDate) {
  try {
    return tripDates(startDate, endDate).length;
  } catch {
    return 0;
  }
}
