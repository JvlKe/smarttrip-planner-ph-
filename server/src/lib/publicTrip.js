// Explicit fields keep new private model properties out of public share links.
export function publicTrip(trip) {
  const { name, customLocation, startDate, endDate, travelers, totalBudget, destination } = trip;
  return {
    name, customLocation, startDate, endDate, travelers, totalBudget,
    destination: destination ? { name: destination.name } : null,
    days: trip.days.map(day => ({
      id: day.id, dayNumber: day.dayNumber, title: day.title, date: day.date,
      activities: day.activities.map(activity => ({
        id: activity.id, title: activity.title, description: activity.description,
        startTime: activity.startTime, location: activity.location,
        estimatedCost: activity.estimatedCost,
      })),
    })),
  };
}
