import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const Check = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);
export const Cross = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
  </svg>
);
export const Hand = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5.5 8V3.75a1 1 0 0 1 2 0V7.5M7.5 7V3a1 1 0 0 1 2 0v4M9.5 7.25V4a1 1 0 0 1 2 0v5.5a4.5 4.5 0 0 1-4.5 4.5h-.3a4 4 0 0 1-3.2-1.6L1.9 10.4a1 1 0 0 1 1.5-1.3L5.5 11" />
  </svg>
);
export const Lock = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.25" y="7" width="9.5" height="6.5" rx="1.5" />
    <path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.5 0V7" />
  </svg>
);
export const Arrow = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
export const Search = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="m10.25 10.25 3 3" />
  </svg>
);
export const Warning = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 2.5 14 13H2L8 2.5Z" />
    <path d="M8 6.5v3M8 11.25v.01" />
  </svg>
);

/** The Leash mark: a loop (the handle) running into a line. */
export const Mark = (p: P) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden {...p}>
    <path d="M8.5 13.5a4.5 4.5 0 1 1 4.2-6.1" />
    <path d="M12.7 7.4 19.5 19" />
    <circle cx="19.5" cy="19" r="1.25" fill="currentColor" stroke="none" />
  </svg>
);
