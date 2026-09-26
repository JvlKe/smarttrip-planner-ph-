export const DEFAULT_STARTING_POINT = "Cubao, Quezon City, Philippines";

export function startingPointFor(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : DEFAULT_STARTING_POINT;
}
