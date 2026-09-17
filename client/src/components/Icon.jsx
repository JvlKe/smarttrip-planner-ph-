const paths = {
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z",
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  trips: "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M4 6h16v14H4zM8 6v14M16 6v14",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16",
  chart: "M4 20h17M6 16v-5M12 16V4M18 16V8",
  plus: "M12 4v16M4 12h16",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  logout: "M9 3H4v18h5M9 12h12M17 8l4 4-4 4",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0M15 15l6 6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6",
  plane: "m21 3-7 18-3-8-8-3zM11 13 21 3",
  wallet: "M20 7V4H4v16h17V7H4M21 11h-6v5h6",
  calendar: "M4 5h16v16H4zM8 3v4M16 3v4M4 10h16",
  arrow: "M4 12h16M14 6l6 6-6 6",
  check: "m4 12 5 5L20 6",
  edit: "m15 4 5 5M3 21l2-7L17 2l5 5-12 12z",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  award: "M18 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0M8 13l-2 9 6-3 6 3-2-9",
  download: "M12 3v12M7 10l5 5 5-5M4 16v5h16v-5",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "m5 5 14 14M5 19 19 5",
};
export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.pin} />
    </svg>
  );
}
