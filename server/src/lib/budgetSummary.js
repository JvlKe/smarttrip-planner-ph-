/**
 * budgetSummary.js
 *
 * Computes a structured budget summary from a trip object whose shape mirrors
 * the Prisma schema:
 *
 *   trip {
 *     totalBudget  : Decimal | string | number
 *     travelers    : number
 *     days         : Array<{
 *       activities : Array<{
 *         category      : string
 *         estimatedCost : Decimal | string | number | null | undefined
 *       }>
 *     }>
 *   }
 *
 * All money arithmetic uses integer cents (×100) so that values such as
 * 0.10 + 0.20 yield exactly 0.30 rather than 0.30000000000000004.
 *
 * The input trip object is never mutated.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Prisma Decimal, string, or plain number to an integer cent value.
 * Returns null when the value is absent, non-finite, or cannot be parsed.
 *
 * A Prisma `Decimal` exposes `.toFixed()` / `.toString()` just like a plain
 * JS object, so `String(value)` covers all three incoming types uniformly.
 */
function toCents(value) {
  if (value === null || value === undefined) return null;

  // Prisma Decimal objects, strings, and numbers all convert cleanly via
  // String() before we parse.
  const str = String(value).trim();
  if (str === "" || str === "null" || str === "undefined") return null;

  const n = Number(str);
  if (!Number.isFinite(n)) return null;

  // Round to the nearest cent to absorb sub-cent floating-point noise that
  // can appear when Prisma hands back a JS Number from a Decimal column.
  return Math.round(n * 100);
}

/** Convert integer cents back to a two-decimal-place JS number. */
function fromCents(cents) {
  return Math.round(cents) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} BudgetSummary
 * @property {number}   scheduledTotal      - Sum of all valid activity costs (PHP).
 * @property {number}   remainingBudget     - totalBudget − scheduledTotal (PHP).
 * @property {boolean}  isOverBudget        - true when scheduledTotal > totalBudget.
 * @property {number}   percentUsed         - scheduledTotal / totalBudget × 100, or 0 when budget is 0.
 * @property {Object}   byCategory          - { [category]: number } totals in PHP.
 * @property {number}   costPerTraveler     - scheduledTotal / travelers (PHP).
 * @property {string[]} warnings            - Human-readable warnings for bad cost values.
 */

/**
 * Summarise the scheduled activity spend of a trip.
 *
 * @param {Object} trip
 * @param {*}      trip.totalBudget  - Prisma Decimal, string, or number.
 * @param {number} trip.travelers    - Positive integer; defaults to 1 if absent/invalid.
 * @param {Array}  [trip.days]       - Array of ItineraryDay-shaped objects.
 * @returns {BudgetSummary}
 */
export function computeBudgetSummary(trip) {
  const warnings = [];

  // --- budget ceiling ---------------------------------------------------
  const budgetCents = toCents(trip?.totalBudget) ?? 0;
  if (budgetCents === 0 && trip?.totalBudget != null) {
    warnings.push("Trip totalBudget is missing or invalid; treating as 0.");
  }

  // --- traveller count --------------------------------------------------
  // Must be a positive whole number.  Decimals (2.5), zero, negatives, and
  // NaN are all invalid; we fall back to 1 and warn the caller.
  const rawTravelers = Number(trip?.travelers);
  let travelers;
  if (
    Number.isFinite(rawTravelers) &&
    rawTravelers === Math.floor(rawTravelers) &&
    rawTravelers >= 1
  ) {
    travelers = rawTravelers;
  } else {
    travelers = 1;
    if (trip?.travelers != null) {
      warnings.push(
        `travelers "${trip.travelers}" is not a positive whole number; defaulting to 1.`,
      );
    }
  }

  // --- walk activities --------------------------------------------------
  const days = Array.isArray(trip?.days) ? trip.days : [];

  let totalCents = 0;
  // Use a null-prototype object so that a category named "__proto__" (or any
  // other built-in property) cannot shadow or break category accumulation.
  const byCategoryCents = Object.create(null);

  for (const day of days) {
    const activities = Array.isArray(day?.activities) ? day.activities : [];

    for (const activity of activities) {
      const raw = activity?.estimatedCost;
      const cents = toCents(raw);

      if (cents === null) {
        // Distinguish "not provided at all" from "provided but un-parseable"
        if (raw === null || raw === undefined) {
          warnings.push(
            `Activity "${activity?.title ?? "(untitled)"}" has no estimatedCost; skipped.`,
          );
        } else {
          warnings.push(
            `Activity "${activity?.title ?? "(untitled)"}" has invalid estimatedCost "${raw}"; skipped.`,
          );
        }
        continue;
      }

      // Negative costs are not valid — they are not discounts and would make
      // the trip appear cheaper than it really is.
      if (cents < 0) {
        warnings.push(
          `Activity "${activity?.title ?? "(untitled)"}" has a negative estimatedCost (${raw}); skipped.`,
        );
        continue;
      }

      const rawCategory = String(activity?.category ?? "").trim();
      const category = rawCategory || "Uncategorised";
      totalCents += cents;
      byCategoryCents[category] = (byCategoryCents[category] ?? 0) + cents;
    }
  }

  // --- derive final values ----------------------------------------------
  const scheduledTotal = fromCents(totalCents);
  const remainingBudget = fromCents(budgetCents - totalCents);
  const isOverBudget = totalCents > budgetCents;
  const percentUsed =
    budgetCents > 0
      ? Math.round((totalCents / budgetCents) * 10000) / 100 // 2 dp
      : 0;
  const costPerTraveler = fromCents(Math.round(totalCents / travelers));

  // Convert cent-based category map to PHP amounts
  const byCategory = Object.fromEntries(
    Object.entries(byCategoryCents).map(([cat, cents]) => [
      cat,
      fromCents(cents),
    ]),
  );

  return {
    scheduledTotal,
    remainingBudget,
    isOverBudget,
    percentUsed,
    byCategory,
    costPerTraveler,
    warnings,
  };
}
