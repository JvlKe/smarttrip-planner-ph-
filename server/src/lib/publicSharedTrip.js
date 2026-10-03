export const publicSharedTripSelect = {
  name: true,
  customLocation: true,
  startDate: true,
  endDate: true,
  travelers: true,
  totalBudget: true,
  destination: { select: { name: true } },
  days: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      dayNumber: true,
      title: true,
      activities: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          location: true,
          estimatedCost: true,
        },
      },
    },
  },
};

// Keep public responses field-allowlisted even if a query later returns more.
export function toPublicSharedTrip(trip) {
  return {
    name: trip.name,
    customLocation: trip.customLocation,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: trip.travelers,
    totalBudget: trip.totalBudget,
    destination: trip.destination ? { name: trip.destination.name } : null,
    days: (trip.days || []).map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      activities: (day.activities || []).map((activity) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        startTime: activity.startTime,
        location: activity.location,
        estimatedCost: activity.estimatedCost,
      })),
    })),
  };
}
