/**
 * scheduleConflicts.js
 *
 * Helper for detecting time overlaps between activities on the same day.
 */

/**
 * Returns the conflicting activity if the proposed activity overlaps with an existing one.
 * Returns null if there are no conflicts.
 *
 * @param {Object} proposed - The new or updated activity { id?, startTime?, durationMin? }
 * @param {Array} existingActivities - Array of other activities for that day
 * @returns {Object|null} The conflicting activity, or null
 */
export function findScheduleConflict(proposed, existingActivities) {
  if (!proposed.startTime || !proposed.durationMin) return null;

  const parseMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const proposedStart = parseMinutes(proposed.startTime);
  const proposedEnd = proposedStart + proposed.durationMin;

  for (const act of existingActivities) {
    // Ignore the activity if we are editing it (don't conflict with itself)
    if (proposed.id && act.id === proposed.id) continue;

    // Ignore activities without a scheduled time or duration
    if (!act.startTime || !act.durationMin) continue;

    const actStart = parseMinutes(act.startTime);
    const actEnd = actStart + act.durationMin;

    // Standard overlap check: (StartA < EndB) and (StartB < EndA)
    // This allows StartA == EndB (back-to-back activities)
    if (proposedStart < actEnd && actStart < proposedEnd) {
      return act;
    }
  }

  return null;
}
