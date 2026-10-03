/**
 * server/src/lib/tripAnalytics.js
 *
 * Helper to calculate monthly trip counts and planned budget totals from trip data.
 * All money arithmetic uses integer cents to avoid floating-point math issues.
 */

function toCents(value) {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (str === "" || str === "null" || str === "undefined") return 0;
  const n = Number(str);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function fromCents(cents) {
  return Math.round(cents) / 100;
}

export function computeTripAnalytics(trips) {
  let totalTrips = 0;
  let totalPlannedBudgetCents = 0;
  const monthlyData = Object.create(null);

  const safeTrips = Array.isArray(trips) ? trips : [];

  for (const trip of safeTrips) {
    if (!trip) continue;

    // The route filters inactive statuses; count every trip passed to this helper.
    totalTrips += 1;

    const budgetCents = toCents(trip.totalBudget);
    totalPlannedBudgetCents += budgetCents;

    // Group by startDate month (YYYY-MM)
    if (trip.startDate) {
      const date = new Date(trip.startDate);
      if (!isNaN(date.getTime())) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const monthKey = `${year}-${month}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { tripCount: 0, plannedBudgetCents: 0 };
        }

        monthlyData[monthKey].tripCount += 1;
        monthlyData[monthKey].plannedBudgetCents += budgetCents;
      }
    }
  }

  // Convert map to sorted array
  const monthly = Object.keys(monthlyData)
    .sort()
    .map((key) => ({
      month: key,
      tripCount: monthlyData[key].tripCount,
      plannedBudget: fromCents(monthlyData[key].plannedBudgetCents),
    }));

  return {
    totalTrips,
    totalPlannedBudget: fromCents(totalPlannedBudgetCents),
    monthly,
  };
}
