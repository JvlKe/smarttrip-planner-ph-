import { api } from "./api";

const PAGE_SIZE = 50;

function tripsFrom(result) {
  const trips = Array.isArray(result) ? result : result?.trips;
  return Array.isArray(trips) ? trips.filter(Boolean) : [];
}

export async function fetchAllTrips() {
  const firstPage = await api(`/trips?page=1&pageSize=${PAGE_SIZE}`);
  if (Array.isArray(firstPage)) return tripsFrom(firstPage);

  const trips = tripsFrom(firstPage);
  const totalPages = Number(firstPage?.pagination?.totalPages);
  if (!Number.isSafeInteger(totalPages) || totalPages <= 1) return trips;

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await api(`/trips?page=${page}&pageSize=${PAGE_SIZE}`);
    trips.push(...tripsFrom(result));
  }

  return trips;
}
