import React from "react";

/*
 * Illustrated icons for the energy-flow nodes. Each uses its source's identity
 * colour (solar amber, grid violet, home sky) with one soft accent, drawn on a
 * 48×48 grid so they stay crisp at the 40px they are shown at.
 */

export function SolarPanelIcon({ active = true, className = "h-10 w-10" }: { active?: boolean; className?: string }) {
  const sun = active ? "#f59e0b" : "#cbd5e1";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* sun rising behind the panel, centred above it */}
      <g stroke={sun} strokeWidth="2.4" strokeLinecap="round">
        <line x1="24" y1="1.5" x2="24" y2="5" />
        <line x1="35.5" y1="13" x2="39" y2="13" />
        <line x1="32.1" y1="4.9" x2="34.6" y2="2.4" />
        <line x1="15.9" y1="4.9" x2="13.4" y2="2.4" />
        <line x1="12.5" y1="13" x2="9" y2="13" />
      </g>
      <circle cx="24" cy="13" r="8" fill={sun} />
      {/* tilted panel */}
      <path d="M8 20 H36 L40 34 H4 Z" fill="#e0f2fe" stroke="#0369a1" strokeWidth="2" strokeLinejoin="round" />
      <path d="M17.3 20 L15.3 34 M26.7 20 L28.7 34 M6 27 H38" stroke="#0369a1" strokeWidth="1.6" />
      {/* stand */}
      <path d="M22 34 V41 M16 42 H28" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function GridTowerIcon({ active = true, className = "h-10 w-10" }: { active?: boolean; className?: string }) {
  const c = active ? "#7c3aed" : "#94a3b8";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {/* lattice tower */}
      <path d="M24 4 L15 44 M24 4 L33 44" />
      <path d="M12 13 H36 M14 21 H34" />
      <path d="M19.2 25 L28.8 35 M28.8 25 L19.2 35 M17.5 35 H30.5" />
      {/* insulators */}
      <path d="M12 13 V16.5 M36 13 V16.5 M14 21 V24.5 M34 21 V24.5" />
      <path d="M11 44 H37" stroke="#cbd5e1" />
    </svg>
  );
}

export function HouseIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" strokeLinejoin="round">
      {/* chimney */}
      <path d="M32 9 H37 V17" fill="none" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" />
      {/* body + roof */}
      <path d="M10 22 V41 H38 V22" fill="#e0f2fe" stroke="#0369a1" strokeWidth="2.2" />
      <path d="M5 24 L24 7 L43 24" fill="none" stroke="#0284c7" strokeWidth="2.6" strokeLinecap="round" />
      {/* door + lit window */}
      <path d="M20 41 V31 a4 4 0 0 1 8 0 V41" fill="#ffffff" stroke="#0369a1" strokeWidth="2" />
      <rect x="29.5" y="25" width="5.5" height="5.5" rx="1" fill="#fcd34d" stroke="#0369a1" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * The inverter by what it does, drawn as its symbol on a wiring diagram: a box
 * split corner to corner, direct current (a solid and a dashed line) on one
 * side and the alternating-current wave it turns it into on the other.
 */
export function InverterIcon({ active = true, className = "h-10 w-10" }: { active?: boolean; className?: string }) {
  // A wall-mounted hybrid inverter: case, display with a charging bolt,
  // status lights, cooling vents and the cables underneath.
  const frame = active ? "#ea580c" : "#94a3b8";
  const body = active ? "#fff7ed" : "#f8fafc";
  const screen = active ? "#7c2d12" : "#cbd5e1";
  const bolt = active ? "#fbbf24" : "#f8fafc";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* cables */}
      <path d="M19 42 V46 M29 42 V46" stroke={frame} strokeWidth="2.2" />
      {/* case */}
      <rect x="10.5" y="3.5" width="27" height="39" rx="5.5" fill={body} stroke={frame} strokeWidth="2.2" />
      {/* display with bolt */}
      <rect x="15" y="8.5" width="18" height="14" rx="2.6" fill={screen} />
      <path d="M25.6 10.6 L19.8 16.6 H23.6 L22.4 20.6 L28.2 14.6 H24.4 Z" fill={bolt} />
      {/* status lights */}
      <circle cx="19" cy="27.5" r="1.7" fill={active ? "#22c55e" : "#cbd5e1"}>
        {active && <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />}
      </circle>
      <circle cx="24" cy="27.5" r="1.7" fill={active ? "#f59e0b" : "#cbd5e1"} />
      {/* vents */}
      <path d="M16.5 33 H31.5 M16.5 37 H31.5" stroke={active ? "#fdba74" : "#cbd5e1"} strokeWidth="2" />
    </svg>
  );
}
