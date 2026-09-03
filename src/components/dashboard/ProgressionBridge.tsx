import { useState } from "react";

import { COLORS, compact, n0, pct, share, type Totals } from "@/lib/directful";

const W = 1000;
const H = 420;
const TOP = 60;
const BOTTOM = 330;
const LEFT = 80;
const RIGHT = W - 30;

type Step = {
  key: string;
  label: string;
  sub: string;
  color: string;
  from: number;
  to: number;
  total?: boolean;
  note: string;
};

function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(v);
  return out;
}

/**
 * Progression bridge: how many guests you could reach at the starting point,
 * what Level 1 added, what Level 2 added, and where you are now.
 */
export function ProgressionBridge({ t, hasL2 }: { t: Totals; hasL2: boolean }) {
  const [hover, setHover] = useState<{ x: number; y: number; step: Step } | null>(null);

  const afterL1 = t.starting.guests + t.l1.guests;
  const l2Guests = hasL2 ? t.l2.guests : 0;
  const now = afterL1 + l2Guests;

  const steps: Step[] = [
    {
      key: "start",
      label: "Starting point",
      sub: "Before Directful",
      color: COLORS.starting,
      from: 0,
      to: t.starting.guests,
      note: `${share(t.starting.guests, t.bookings)} of all bookings were reachable.`,
    },
    {
      key: "l1",
      label: "Level 1",
      sub: "Guests added",
      color: COLORS.l1,
      from: t.starting.guests,
      to: afterL1,
      note: `Level 1 made ${n0(t.l1.guests)} more guests reachable.`,
    },
    ...(hasL2
      ? [
          {
            key: "l2",
            label: "Level 2",
            sub: "Guests added",
            color: COLORS.l2,
            from: afterL1,
            to: now,
            note: `Level 2 made ${n0(t.l2.guests)} more guests reachable.`,
          },
        ]
      : []),
    {
      key: "now",
      label: "Now",
      sub: "Guests you can reach",
      color: COLORS.l2,
      from: 0,
      to: now,
      total: true,
      note: `${pct(t.upliftFromStart)} more than your starting point.`,
    },
  ];

  const max = Math.max(now * 1.15, 1);
  const y = (v: number) => Math.round((BOTTOM - (v / max) * (BOTTOM - TOP)) * 100) / 100;
  const ticks = niceTicks(max);
  const slot = (RIGHT - LEFT) / steps.length;
  const bw = Math.min(120, slot - 40);
  const x = (i: number) => Math.round((LEFT + slot * i + (slot - bw) / 2) * 100) / 100;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Progression from starting point to now"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={LEFT}
              y1={y(v)}
              x2={RIGHT}
              y2={y(v)}
              stroke="var(--border)"
              strokeOpacity={v === 0 ? 1 : 0.5}
            />
            <text
              x={LEFT - 12}
              y={y(v) + 4}
              textAnchor="end"
              className="num"
              fill="var(--muted-foreground)"
              fontSize="12"
            >
              {compact(v)}
            </text>
          </g>
        ))}

        {steps.map((s, i) => {
          if (i === steps.length - 1) return null;
          const next = steps[i + 1]!;
          return (
            <line
              key={`c-${s.key}`}
              x1={x(i) + bw}
              y1={y(s.to)}
              x2={x(i + 1)}
              y2={next.total ? y(next.to) : y(next.from)}
              stroke="var(--muted-foreground)"
              strokeOpacity="0.45"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
          );
        })}

        {steps.map((s, i) => {
          const top = y(s.to);
          const height = Math.max(2, y(s.from) - y(s.to));
          const delta = s.to - s.from;
          return (
            <g key={s.key}>
              <rect
                x={x(i)}
                y={top}
                width={bw}
                height={height}
                rx="8"
                fill={s.color}
                fillOpacity={s.total ? 1 : 0.9}
                className="cursor-help"
                onMouseMove={(e) => {
                  const svg = e.currentTarget.ownerSVGElement!;
                  const r = svg.getBoundingClientRect();
                  setHover({
                    x: ((e.clientX - r.left) / r.width) * 100,
                    y: ((e.clientY - r.top) / r.height) * 100,
                    step: s,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              />
              <text
                x={x(i) + bw / 2}
                y={top - 10}
                textAnchor="middle"
                className="num pointer-events-none"
                fill={s.total ? "var(--l2)" : "var(--foreground)"}
                fontSize={s.total ? "26" : "16"}
                fontWeight="700"
              >
                {s.total ? compact(s.to) : `+${compact(delta)}`}
              </text>
              <text
                x={x(i) + bw / 2}
                y={BOTTOM + 26}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize="14"
                fontWeight="600"
              >
                {s.label}
              </text>
              <text
                x={x(i) + bw / 2}
                y={BOTTOM + 44}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="12"
              >
                {s.sub}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover p-3 text-xs shadow-lg"
          style={{ left: `${hover.x}%`, top: `${hover.y}%` }}
        >
          <p className="font-semibold" style={{ color: hover.step.color }}>
            {hover.step.label}
          </p>
          <p className="num mt-1 text-sm font-semibold">
            {hover.step.total
              ? `${n0(hover.step.to)} guests`
              : `+${n0(hover.step.to - hover.step.from)} guests`}
          </p>
          <p className="mt-1 text-muted-foreground">{hover.step.note}</p>
        </div>
      )}
    </div>
  );
}
